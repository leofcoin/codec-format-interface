import test from 'node:test'
import assert from 'node:assert/strict'
import { FormatInterface, Codec, CodecHash, codecs } from './../exports/index.js'
const _hash = 'IHT4DAQHLJVV5JLW2JRWXEHUVQAPTHPQTCSJTWNKWQ2XXHWMV3UFQYX3Y7C'
globalThis.peernet = { codecs: {} }

const toArray = (value) => Array.from(value)
const toUint8Array = (value) => (value instanceof Uint8Array ? value : Uint8Array.from(value))

class FormatTest extends FormatInterface {
  get messageName() {
    return 'Message'
  }
  constructor(data) {
    super(
      data,
      {
        somedata: 'test'
      },
      { name: 'peernet-ps' }
    )
  }
}

test('format encode/decode', async () => {
  const message = new FormatTest({ somedata: 'hello', hash: _hash })
  const m2 = new FormatTest(message.toBs58())
  assert.ok(message.encoded, 'can encode')
  assert.equal(m2.decoded.somedata, 'hello', 'can decode')
})

test('format round-trip keeps encoded bytes stable', () => {
  const source = new FormatTest({ somedata: 'hello', hash: _hash })
  const sourceBytes = toArray(source.encoded)

  const fromUint8 = new FormatTest(source.encoded)
  assert.deepEqual(
    toArray(fromUint8.encoded),
    sourceBytes,
    'Uint8Array input keeps identical bytes'
  )

  const fromArrayBuffer = new FormatTest(source.encoded.buffer.slice(0))
  assert.deepEqual(
    toArray(fromArrayBuffer.encoded),
    sourceBytes,
    'ArrayBuffer input keeps identical bytes'
  )

  const canonical = new FormatTest(source.encoded)
  assert.equal(canonical.toBs58(), source.toBs58(), 'base58 output is stable after round-trip')
  assert.equal(canonical.toBs32(), source.toBs32(), 'base32 output is stable after round-trip')
  assert.equal(canonical.toHex(), source.toHex(), 'hex output is stable after round-trip')
  assert.equal(canonical.toString(), source.toString(), 'CSV output is stable after round-trip')
})

test('codec round-trip keeps encoded bytes and name', () => {
  const fromName = new Codec('peernet-ps')
  const encoded = toUint8Array(fromName.encode())
  const fromCodecNumber = new Codec(fromName.codec)

  assert.equal(fromCodecNumber.codec, fromName.codec, 'codec number is preserved')
  assert.deepEqual(
    toArray(toUint8Array(fromCodecNumber.encode())),
    toArray(encoded),
    'encoded bytes are preserved'
  )
})

test('format can hash', async () => {
  const message = new FormatTest({ somedata: 'hello' })
  const hash = await message.hash()
  assert.equal(hash, _hash, 'can hash')
  assert.equal(typeof hash, 'string', 'hash is string')
})

test('format fromUint8Array and fromArrayBuffer', () => {
  const arr = new Uint8Array([48, 10, 5, 104, 101, 108, 108, 111])
  const msg1 = new FormatTest(arr)
  assert.ok(msg1.encoded, 'fromUint8Array works')
  const buf = arr.buffer
  const msg2 = new FormatTest(buf)
  assert.ok(msg2.encoded, 'fromArrayBuffer works')
})

test('format create edge cases', () => {
  const msg = new FormatTest({ somedata: 'hello', hash: _hash })
  msg.create({ somedata: 'world', hash: _hash })
  assert.equal(msg.decoded.somedata, 'world', 'create updates decoded')
})

test('format error on invalid codec', () => {
  class BadFormat extends FormatInterface {
    get name() {
      return 'bad'
    }
    get keys() {
      return ['foo']
    }
    protoEncode() {
      return new Uint8Array([1, 2, 3])
    }
  }
  const bad = new BadFormat({ foo: 'bar' })
  bad.name = 'invalid'
  assert.throws(() => bad.encode({ foo: 'bar' }), undefined, 'throws on invalid codec')
})

test('has codecs', async () => {
  assert.ok(Object.keys(codecs).length !== 0, 'codecs are present')
})

test('Codec and CodecHash basic usage', () => {
  const codec = new Codec('peernet-ps')
  assert.ok(codec, 'Codec instance created')
  const hash = new CodecHash({ name: 'peernet-ps' })
  assert.ok(hash, 'CodecHash instance created')
})

test('CodecHash can handle large files', async () => {
  // Size in bytes: default 100MB, can be set via LARGE_FILE_SIZE env var
  // For 2GB test: LARGE_FILE_SIZE=2147483648 npm test
  const size = parseInt(process.env.LARGE_FILE_SIZE || '104857600') // 100MB default
  const sizeMB = (size / 1024 / 1024).toFixed(2)

  console.log(`\nTesting with ${sizeMB}MB file...`)

  // Create a large buffer filled with test data
  const largeBuffer = new Uint8Array(size)
  // Fill with pseudo-random data for more realistic test
  for (let i = 0; i < size; i += 1024) {
    const chunk = i % 256
    largeBuffer.fill(chunk, i, Math.min(i + 1024, size))
  }

  console.log(`Buffer created: ${sizeMB}MB`)

  const startTime = Date.now()
  const hash = new CodecHash({ name: 'disco-hash' })
  await hash.init(largeBuffer)
  const endTime = Date.now()

  const duration = ((endTime - startTime) / 1000).toFixed(2)
  console.log(
    `Hashing took ${duration}s (${(size / (endTime - startTime) / 1024).toFixed(2)} MB/s)`
  )

  assert.ok(hash.encoded, 'large file encoded successfully')
  assert.ok(hash.digest, 'large file has digest')
  assert.equal(hash.size, hash.digest.length, 'digest size is correct')
})

test('format can handle BigInt values', async () => {
  class BigIntFormat extends FormatInterface {
    constructor(data) {
      super(
        data,
        {
          id: 'test',
          amount: 0n,
          timestamp: 0n
        },
        { name: 'peernet-ps' }
      )
    }
  }

  const bigData = {
    id: 'transaction',
    amount: 999999999999999999999999999n,
    timestamp: 1738963200000n
  }

  const message = new BigIntFormat(bigData)
  assert.ok(message.encoded, 'can encode with BigInt')
  assert.equal(message.decoded.amount, bigData.amount, 'BigInt amount preserved')
  assert.equal(message.decoded.timestamp, bigData.timestamp, 'BigInt timestamp preserved')

  const hash = await message.hash()
  assert.equal(typeof hash, 'string', 'hash is string')

  const decoded = new BigIntFormat(message.encoded)
  assert.equal(decoded.decoded.amount, bigData.amount, 'BigInt survives encode/decode cycle')
})
