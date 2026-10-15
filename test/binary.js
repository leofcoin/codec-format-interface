import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { Codec, CodecHash } from '../exports/index.js'

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
