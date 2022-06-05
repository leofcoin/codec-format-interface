const test = require('tape');
const {FormatInterface} = require('./../dist/index')

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
  await message.encode()
  const m2 = await new FormatTest(message.encoded)
  await m2.decode()
  tape.ok(message.encoded, 'can encode')
  tape.ok(m2.decoded.somedata === 'hello', 'can decode')
})
