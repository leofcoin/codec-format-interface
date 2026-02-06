import test from 'tape'
import { FormatInterface, Codec, CodecHash, codecs } from './../exports/index.js'
const _hash = 'IHT4DAQGCEP6WX3BPPP5USUKUN5BJMMPGJANIQILS5EXIZ2BQ6TFJMH2PEX'
const bs32hash = 'HT4DAQGBLIMVWGY3YA'
globalThis.peernet = { codecs: {} }

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

const encoded = [48, 10, 5, 104, 101, 108, 108, 111]

test('format encode/decode', async (tape) => {
  tape.plan(2)
  const message = new FormatTest({ somedata: 'hello', hash: _hash })
  const m2 = new FormatTest(message.toBs58())
  tape.ok(message.encoded, 'can encode')
  tape.equal(m2.decoded.somedata, 'hello', 'can decode')
})

test('format can hash', async (tape) => {
  tape.plan(2)
  const message = new FormatTest({ somedata: 'hello' })
  const hash = await message.hash()
  tape.ok(hash === _hash, 'can hash')
  tape.ok(typeof hash === 'string', 'hash is string')
})

test('format fromUint8Array and fromArrayBuffer', (tape) => {
  tape.plan(2)
  const arr = new Uint8Array([48, 10, 5, 104, 101, 108, 108, 111])
  const msg1 = new FormatTest(arr)
  tape.ok(msg1.encoded, 'fromUint8Array works')
  const buf = arr.buffer
  const msg2 = new FormatTest(buf)
  tape.ok(msg2.encoded, 'fromArrayBuffer works')
})

test('format create edge cases', (tape) => {
  tape.plan(1)
  const msg = new FormatTest({ somedata: 'hello', hash: _hash })
  msg.create({ somedata: 'world', hash: _hash })
  tape.equal(msg.decoded.somedata, 'world', 'create updates decoded')
})

test('format error on invalid codec', (tape) => {
  tape.plan(1)
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
  tape.throws(() => bad.encode({ foo: 'bar' }), 'throws on invalid codec')
})

test('format can hash', async (tape) => {
  tape.plan(1)
  const message = new FormatTest({ somedata: 'hello' })
  const hash = await message.hash()
  console.log(hash)
  tape.ok(hash === _hash, 'can hash')
})

test('has codecs', async (tape) => {
  tape.plan(1)
  tape.ok(Object.keys(codecs).length !== 0, 'codecs are present')
})

test('Codec and CodecHash basic usage', (tape) => {
  tape.plan(2)
  const codec = new Codec('peernet-ps')
  tape.ok(codec, 'Codec instance created')
  const hash = new CodecHash({ somedata: 'hello' }, { name: 'peernet-ps' })
  tape.ok(hash, 'CodecHash instance created')
})
