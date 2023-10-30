import test from 'tape'
import {FormatInterface, codecs} from './../dist/index.js'
const _hash = "IHT4DAQGU4CIFPGPGMG4Y2UWETXU6K52VEGGXLAC7DXZYAV67HM233RIUGC"
globalThis.peernet = {codecs: {}}
class FormatTest extends FormatInterface {
  get messageName() { return 'Message' }

  constructor(data) {
    super(data, {
      somedata: 'test'
    } , {name: 'peernet-ps'})
  }
}

const encoded =  [48,  10,   5, 104, 101, 108, 108, 111]

test('format', async  (tape) => {
  tape.plan(2)
  const message = new FormatTest({somedata: 'hello'})
  
  const m2 = new FormatTest(message.encoded)
  
  tape.ok(message.encoded, 'can encode')
  tape.ok(m2.decoded.somedata === 'hello', 'can decode')
})

test('format can hash', async  (tape) => {
  tape.plan(1)
  const message = new FormatTest({somedata: 'hello'})
  const hash = await message.hash()
  console.log(hash);
  tape.ok(hash === _hash, 'can hash')
  
})

test('has codecs', async  (tape) => {
  tape.plan(1)
  tape.ok(Object.keys(codecs).length !== 0)
})