import test from 'tape'
import {FormatInterface, codecs} from './../dist/index.js'

globalThis.peernet = {codecs: {}}
class FormatTest extends FormatInterface {
  get keys() { return ['somedata'] }
  get messageName() { return 'Message' }

  constructor(data) {
    super(data, `message Message {
      required string somedata = 1;
    }`, {name: 'disco-hash'})
  }
}

const encoded =  [48,  10,   5, 104, 101, 108, 108, 111]

test('format', async  (tape) => {
  tape.plan(2)
  const message = await new FormatTest({somedata: 'hello'})
  
  const m2 = await new FormatTest(message.encoded)
  
  tape.ok(message.encoded, 'can encode')
  tape.ok(m2.decoded.somedata === 'hello', 'can decode')
})

test('format can hash', async  (tape) => {
  tape.plan(1)
  const message = await new FormatTest({somedata: 'hello'})
  const hash = await message.hash()
  tape.ok(hash, 'can hash')
  
})

test('has codecs', async  (tape) => {
  tape.plan(1)
  tape.ok(Object.keys(codecs).length !== 0)
})