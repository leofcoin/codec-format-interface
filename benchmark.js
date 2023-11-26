import { Bench } from 'tinybench';
import {FormatInterface, codecs, CodecHash, Codec } from './exports/index.js'
import subtle from '@leofcoin/crypto/subtle'

const _hash = "IHT4DAQGU4CIFPGPGMG4Y2UWETXU6K52VEGGXLAC7DXZYAV67HM233RIUGC"
globalThis.peernet = {codecs: {}}
class B {
  #decoded
  hash
  constructor(ob) {
    if (ob instanceof Object) this.decoded = ob
    else {
      this.decoded = JSON.parse(ob)
    }
  }

  encode() {
    return new TextEncoder().encode(JSON.stringify(this.decoded))
  }

  set decoded(value) {
    if (value.hash) 
      this.hash = value.hash
      delete value.hash;
    
    this.#decoded = value
  }

  get decoded() {
    return this.#decoded
  }

  hash() {

  }

  async digestMessage(message) {
    return subtle.digest("SHA-512", this.encode());
  }
}

const encoded = new B({somedata: 'hello'})
console.log(await encoded.digestMessage())

const bench = new Bench({ time: 100 });

class FormatTest extends FormatInterface {
  get messageName() { return 'Message' }

  constructor(data) {
    super(data, {
      somedata: 'test'
    } , {name: 'peernet-ps'})
  }
}

const jsonString = JSON.stringify({somedata: 'hello'})
let message, uint8String
bench
  .add('init message', () => {
    message = new FormatTest({somedata: 'hello'})
  })
  .add('message to string', () => {    
    uint8String = message.toString()
  })
  .add('message from string', () => {
    message = new FormatTest(uint8String)
  })
  .add('hash message', async () => {
    await message.hash()
  })
  .add('json to string', () => {
    JSON.stringify({somedata: 'hello'})
  })
  .add('json from string', () => {
    JSON.parse(jsonString)
  })
  .add('json to hash', async () => {
    await subtle.digest('SHA-512', new TextEncoder().encode(JSON.stringify({somedata: 'hello'})))
  })
  .add('jsonb to string', () => {
    new B({somedata: 'hello'}).encode()
  })
  .add('jsonb hash', async () => {
    const encoded = new B({somedata: 'hello'}).encode()
    
    await subtle.digest('SHA-512', encoded)
  })

await bench.run();

console.table(bench.table());