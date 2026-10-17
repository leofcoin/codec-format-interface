import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { Codec, CodecHash, FormatInterface } from '../exports/index.js'
import { utils as codecUtils } from '@leofcoin/codecs'

const fixtures = [
  ['peernet-ps', [243, 224, 193, 3], '20f3e0c10355e5d94c766a7d17017a41fe7a9af5e45b4c3adcea9f8921e6e31bcdc66886bf'],
  ['disco-hash', [48], '20306cc616d3a29e5bdb8ff68390ca373cbd6806ad9c4a324305a1c8881a42fc0d54'],
  ['leofcoin-block', [226, 216, 1], '40e2d801eb106f73b168b0ba8f0ac689d8ec05df182820bc167bbf4fa30ccbe4345d4ab0924ae5a73a3ed7a60fdc254061a996021ffb331bdd932ef69641fbf10a4e32ca'],
  ['transaction-message', [237, 232, 1], '20ede80155e5d94c766a7d17017a41fe7a9af5e45b4c3adcea9f8921e6e31bcdc66886bf']
]

test('codec headers retain frozen pre-migration bytes across input views', () => {
  for (const [name, bytes] of fixtures) {
    const codec = new Codec(name)
    assert.deepEqual(Array.from(codec.encode()), bytes)
    assert.deepEqual(Array.from(new Codec(codec.codec).encode()), bytes)
    for (const input of [Uint8Array.from(bytes), Uint8Array.from(bytes).buffer, Buffer.from(bytes)]) {
      const decoded = new Codec(input)
      assert.equal(decoded.name, name)
      assert.equal(decoded.codec, codec.codec)
      assert.deepEqual(Array.from(decoded.encode()), bytes)
    }
  }
})

test('hash encoding retains frozen pre-migration digests and header order', async () => {
  for (const [name, , hex] of fixtures) {
    const hash = new CodecHash({ name })
    await hash.encode(new TextEncoder().encode('binary migration fixture'))
    assert.equal(Buffer.from(hash.encoded).toString('hex'), hex)
  }
})

test('current and legacy hash headers round-trip without rewriting stored bytes', async () => {
  for (const [name, codec, hex] of fixtures) {
    const current = new Uint8Array(Buffer.from(hex, 'hex'))
    const digest = current.slice(1 + codec.length)
    const legacy = new Uint8Array([...codec, digest.length, ...digest])
    const paddedCodec = [...codec.slice(0, -1), codec.at(-1) | 128, 0]
    const paddedSize = [digest.length | 128, 0]
    const paddedCurrent = new Uint8Array([...paddedSize, ...paddedCodec, ...digest])
    const paddedLegacy = new Uint8Array([...paddedCodec, ...paddedSize, ...digest])
    for (const input of [current, legacy, paddedCurrent, paddedLegacy]) {
      const hash = new CodecHash()
      const decoded = hash.decode(input)
      assert.equal(decoded.name, name)
      assert.equal(decoded.size, digest.length)
      assert.deepEqual(decoded.digest, digest)
      assert.deepEqual(Array.from(decoded.codec), codec)
      assert.equal(hash.toHex(), Buffer.from(input).toString('hex'))
      assert.deepEqual((await new CodecHash().init(input)).encoded, input)
      const validated = new CodecHash()
      await validated.validate(input)
      assert.deepEqual(validated.encoded, input)
      const repeated = new CodecHash()
      repeated.fromBs32(hash.toBs32())
      assert.deepEqual(repeated.encoded, input)
      repeated.fromBs58(hash.toBs58())
      assert.deepEqual(repeated.encoded, input)
    }
  }
})

test('hash parsing respects Buffer and Uint8Array view offsets', () => {
  const bytes = Buffer.from(fixtures[0][2], 'hex')
  const padded = new Uint8Array([77, ...bytes, 88])
  const buffered = Buffer.from(padded)
  for (const view of [padded.subarray(1, -1), buffered.subarray(1, -1)]) {
    const hash = new CodecHash()
    hash.decode(view)
    assert.equal(hash.name, fixtures[0][0])
    assert.equal(hash.toHex(), fixtures[0][2])
  }
})

test('failed hash decoding leaves prior state and cached strings intact', () => {
  const hash = new CodecHash()
  hash.decode(new Uint8Array(Buffer.from(fixtures[0][2], 'hex')))
  const before = {
    encoded: hash.encoded, digest: hash.digest, codec: hash.codec,
    name: hash.name, size: hash.size, hex: hash.toHex(), bs32: hash.toBs32()
  }
  for (const input of [
    new Uint8Array([48, 128]),
    new Uint8Array([32, 48, 1]),
    new Uint8Array([48, 32, 1]),
    new Uint8Array([1, 127, 9]),
    new Uint8Array([...Buffer.from(fixtures[0][2], 'hex'), 0])
  ]) {
    assert.throws(() => hash.decode(input))
    assert.equal(hash.encoded, before.encoded)
    assert.equal(hash.digest, before.digest)
    assert.equal(hash.codec, before.codec)
    assert.equal(hash.name, before.name)
    assert.equal(hash.size, before.size)
    assert.equal(hash.toHex(), before.hex)
    assert.equal(hash.toBs32(), before.bs32)
  }
})

test('successful hash reuse invalidates encoded-string and decoded-field caches', async () => {
  const hash = new CodecHash()
  hash.decode(new Uint8Array(Buffer.from(fixtures[0][2], 'hex')))
  const previous = hash.toBs32()
  hash.toHex()
  hash.toString()
  hash.decode(new Uint8Array(Buffer.from(fixtures[1][2], 'hex')))
  assert.equal(hash.toHex(), fixtures[1][2])
  assert.notEqual(hash.toBs32(), previous)
  assert.equal(hash.decoded.name, fixtures[1][0])
  await hash.encode(new Uint8Array([1, 2, 3]))
  assert.equal(hash.toHex(), Buffer.from(hash.encoded).toString('hex'))
  assert.equal(hash.decoded.name, fixtures[1][0])
})

test('format hashing always treats message content as raw bytes, not a hash header', async () => {
  class RawFormat extends FormatInterface {
    constructor(data) { super(data, { data: '' }, { name: 'peernet-ps' }) }
  }
  for (const length of [20, 28, 32, 48, 64]) {
    const message = new RawFormat({ data: '0'.repeat(length) })
    const expected = new CodecHash({ name: message.name })
    await expected.encode(message.contentBytes)
    assert.equal(await message.hash(), expected.toBs32())
    message.decoded = { ...message.decoded, hash: 'non-content metadata' }
    assert.equal((await message.peernetHash).toBs32(), expected.toBs32())
  }
})

test('registered codec/length collisions are resolved by complete digest lengths', async () => {
  codecUtils.addCodec({ name: 'test-codec-32-sha384', codec: 32, hashAlg: 'sha-384' })
  codecUtils.addCodec({ name: 'test-codec-64-sha512', codec: 64, hashAlg: 'sha-512' })
  for (const name of ['test-codec-32-sha384', 'test-codec-64-sha512']) {
    const source = new CodecHash({ name })
    await source.encode(new Uint8Array([1, 2, 3]))
    const current = source.encoded
    const legacy = new Uint8Array([...source.codec, ...source.length, ...source.digest])
    for (const bytes of [current, legacy]) {
      const decoded = new CodecHash().decode(bytes)
      assert.equal(decoded.name, name)
      assert.deepEqual(decoded.digest, source.digest)
      assert.equal(decoded.size, source.digest.length)
    }
  }
})

test('legacy codec-first hash decoding uses independent consumed-byte cursors', () => {
  const digest = Uint8Array.from({ length: 32 }, (_, index) => index)
  for (const [name, bytes] of fixtures.filter(([name]) => name !== 'leofcoin-block')) {
    const padded = [...bytes.slice(0, -1), bytes.at(-1) | 128, 0]
    for (const header of [[...bytes, 32], [...padded, 160, 0]]) {
      const hash = new CodecHash()
      const decoded = hash.decode(new Uint8Array([...header, ...digest]))
      assert.equal(decoded.name, name)
      assert.equal(decoded.size, digest.length)
      assert.deepEqual(decoded.digest, digest)
      assert.deepEqual(Array.from(decoded.length), [32])
    }
  }
})

test('legacy padded codec prefixes remain accepted without allowing truncated or unsafe integers', () => {
  const decoded = new Codec(new Uint8Array([176, 0]))
  assert.equal(decoded.name, 'disco-hash')
  assert.deepEqual(Array.from(decoded.encode()), [48])
  for (const bytes of [[], [128], new Array(100).fill(255), [...new Array(7).fill(255), 16]]) {
    assert.throws(() => new Codec(Uint8Array.from(bytes)), RangeError)
    assert.throws(() => new CodecHash().decode(Uint8Array.from(bytes)), RangeError)
  }
  assert.throws(() => new CodecHash().decode(new Uint8Array([48, 128])), RangeError)
  assert.throws(() => new CodecHash().decode(new Uint8Array([48, 32, 1])), /hash length inconsistent/)
})

test('raw hash payloads are not required to begin with a valid codec integer', async () => {
  const data = new Uint8Array(4096).fill(255)
  const expected = new CodecHash({ name: 'disco-hash' })
  await expected.encode(data)
  const actual = await new CodecHash({ name: 'disco-hash' }).init(data)
  assert.deepEqual(actual.encoded, expected.encoded)
  await assert.rejects(new CodecHash().init(new Uint8Array([48, 128])), RangeError)
})

test('package graph contains binary but no varint package or Git dependency', async () => {
  const manifest = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))
  const lock = JSON.parse(await readFile(new URL('../package-lock.json', import.meta.url), 'utf8'))
  assert.equal(manifest.dependencies['@leofcoin/binary'], '^1.0.1')
  assert.equal(manifest.dependencies.varint, undefined)
  assert.equal(manifest.devDependencies['@types/varint'], undefined)
  for (const [name, item] of Object.entries(lock.packages)) {
    assert.ok(!name.endsWith('/varint'), name)
    assert.ok(!/^(git\+|git:|github:|file:)/.test(item.resolved ?? ''), name)
  }
})
