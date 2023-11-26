import test from 'tape'
import {FormatInterface, codecs} from './../exports/index.js'
const _hash = "IHT4DAQGCEP6WX3BPPP5USUKUN5BJMMPGJANIQILS5EXIZ2BQ6TFJMH2PEX"
const bs32hash = 'HT4DAQGBLIMVWGY3YA'
globalThis.peernet = {codecs: {}}
class FormatTest extends FormatInterface {
  get messageName() { return 'Message' }

  constructor(data) {
    super(data, {
      somedata: 'test',
      'hash?': ''
    } , {name: 'peernet-ps'})
  }
}

const encoded =  [48,  10,   5, 104, 101, 108, 108, 111]

test('format', async  (tape) => {
  tape.plan(2)
  
  const message = new FormatTest({somedata: 'hello', 
  hash: 'IHT4DAQGCEP6WX3BPPP5USUKUN5BJMMPGJANIQILS5EXIZ2BQ6TFJMH2PEX'})

  const m2 = new FormatTest(message.toBs58())
  m2.hash().then(h => console.log(h))
  console.log(await m2.toBs32());
  console.log(await m2.hash());
  
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