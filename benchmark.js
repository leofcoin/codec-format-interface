import { Bench } from 'tinybench'
import { FormatInterface, codecs, CodecHash, Codec } from './exports/index.js'

const subtle = globalThis.crypto?.subtle || (await import('node:crypto')).webcrypto.subtle
const _hash = 'IHT4DAQGU4CIFPGPGMG4Y2UWETXU6K52VEGGXLAC7DXZYAV67HM233RIUGC'
globalThis.peernet = { codecs: {} }

const _textEncoder = new TextEncoder()

class B {
  #decoded
  hash
  constructor(ob) {
    if (typeof ob === 'string') {
      this.decoded = JSON.parse(ob)
    } else {
      this.decoded = ob
    }
  }

  encode() {
    // Avoid re-encoding if already encoded
    if (this._encoded) return this._encoded
    this._encoded = _textEncoder.encode(JSON.stringify(this.decoded))
    return this._encoded
  }

  set decoded(value) {
    if (value && value.hash) this.hash = value.hash
    if (value && value.hash) delete value.hash
    this.#decoded = value
    this._encoded = undefined // reset cache
  }

  get decoded() {
    return this.#decoded
  }

  hash() {}

  async digestMessage() {
    // Use cached encoded value
    return subtle.digest('SHA-512', this.encode())
  }
}

const encoded = new B({ somedata: 'hello' })
console.log(await encoded.digestMessage())

const bench = new Bench({ time: 500 }) // increased time for catching errors

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

const jsonString = JSON.stringify({ somedata: 'hello' })
let message, uint8String, hexString, bs58String, bs32String

const setupMessage = new FormatTest({ somedata: 'hello' })
uint8String = setupMessage.toString()
hexString = setupMessage.toHex()
bs58String = setupMessage.toBs58()
bs32String = setupMessage.toBs32()

bench
  .add('init message', () => {
    message = new FormatTest({ somedata: 'hello' })
  })
  .add('message to string', () => {
    uint8String = message.toString()
  })
  .add('message from string', () => {
    message = new FormatTest(uint8String)
  })
  .add('message to hex', () => {
    message.toHex()
  })
  .add('message from hex', () => {
    message = new FormatTest(hexString)
  })
  .add('message to bs58', () => {
    message.toBs58()
  })
  .add('message from bs58', () => {
    message = new FormatTest(bs58String)
  })
  .add('message to bs32', () => {
    message.toBs32()
  })
  .add('message from bs32', () => {
    message = new FormatTest(bs32String)
  })
  .add('hash message', async () => {
    await message.hash()
  })
  .add('json to string', () => {
    JSON.stringify({ somedata: 'hello' })
  })
  .add('json from string', () => {
    JSON.parse(jsonString)
  })

  .add('jsonb to string', () => {
    new B({ somedata: 'hello' }).encode()
  })

await bench.run()

// Sort results by average latency (ascending)
const results = bench.tasks
  .map((task, i) => ({
    name: task.name,
    avgLatency: bench.table()[i]['Latency avg (ns)'],
    medLatency: bench.table()[i]['Latency med (ns)'],
    avgThroughput: bench.table()[i]['Throughput avg (ops/s)'],
    medThroughput: bench.table()[i]['Throughput med (ops/s)'],
    samples: bench.table()[i]['Samples']
  }))
  .sort((a, b) => {
    // Extract numeric value from latency string
    const aVal = parseFloat(a.avgLatency)
    const bVal = parseFloat(b.avgLatency)
    return aVal - bVal
  })

console.log('\n=== Benchmark Results (sorted by avg latency) ===')
console.table(results, [
  'name',
  'avgLatency',
  'medLatency',
  'avgThroughput',
  'medThroughput',
  'samples'
])

console.log('\nFastest: %s', results[0].name)
console.log('Slowest: %s', results[results.length - 1].name)

import { writeFileSync, existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

// Save benchmark history
const historyPath = join(process.cwd(), 'benchmark-history.json')
let history = []
if (existsSync(historyPath)) {
  try {
    history = JSON.parse(readFileSync(historyPath, 'utf8'))
  } catch (e) {
    console.warn('Could not parse benchmark-history.json, starting new history.')
    history = []
  }
}
history.push({
  date: new Date().toISOString(),
  results
})
writeFileSync(historyPath, JSON.stringify(history, null, 2))
console.log(`\nBenchmark results appended to ${historyPath}`)
