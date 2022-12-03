import {createKeccak} from 'hash-wasm';
import varint from 'varint';
import BasicInterface from './basic-interface.js'
import Codec from './codec.js';

export default class CodecHash extends BasicInterface {
  constructor(buffer, options = {}) {
    super()
    if (options.name) this.name = options.name
    else this.name = 'disco-hash'
    if (options.codecs) this.codecs = options.codecs
    return this.init(buffer)
  }

  async init(uint8Array) {
    if (uint8Array) {
      if (uint8Array instanceof Uint8Array) {
        this.discoCodec = new Codec(uint8Array, this.codecs)
        const name = this.discoCodec.name

        if (name) {
          this.name = name
          this.decode(uint8Array)
        } else {
          await this.encode(uint8Array)
        }
      }

      if (typeof uint8Array === 'string') {
        if (this.isHex(uint8Array)) await this.fromHex(uint8Array)
        if (this.isBase32(uint8Array)) await this.fromBs32(uint8Array)
        else if (this.isBase58(uint8Array)) await this.fromBs58(uint8Array)
        else throw new Error(`unsupported string ${uint8Array}`)
      } else if (typeof uint8Array === 'object') await this.fromJSON(uint8Array)
    }
    return this
  }
  get prefix() {
    const length = this.length
    const uint8Array = new Uint8Array(length.length + this.discoCodec.codecBuffer.length)
    uint8Array.set(length)
    uint8Array.set(this.discoCodec.codecBuffer, length.length)

    return uint8Array
  }

  get length() {
    return varint.encode(this.size)
  }

  get buffer() {
    return this.encoded
  }

  get hash() {
    return this.encoded
  }

  fromJSON(json) {
    return this.encode(Buffer.from(JSON.stringify(json)))
  }

  async encode(buffer, name) {
    if (!this.name && name) this.name = name;
    if (!buffer) buffer = this.buffer;
    this.discoCodec = new Codec(this.name, this.codecs)
    this.discoCodec.fromName(this.name)
    let hashAlg = this.discoCodec.hashAlg
    const hashVariant = Number(hashAlg.split('-')[hashAlg.split('-').length - 1])
    
    if (hashAlg.includes('dbl')) {
      hashAlg = hashAlg.replace('dbl-', '')
      const hasher = await createKeccak(hashVariant)
      await hasher.init()
      hasher.update(buffer)
      buffer = hasher.digest('binary')
    }
    const hasher = await createKeccak(hashVariant)
    await hasher.init()
    hasher.update(buffer)
    this.digest = hasher.digest('binary')
    this.size = this.digest.length

    this.codec = this.discoCodec.encode();
    this.codec = this.discoCodec.codecBuffer
    const uint8Array = new Uint8Array(this.digest.length + this.prefix.length)
    uint8Array.set(this.prefix)
    uint8Array.set(this.digest, this.prefix.length)

    this.encoded = uint8Array

    return this.encoded
  }

  async validate(buffer) {
    if (Buffer.isBuffer(buffer)) {
      const codec = varint.decode(buffer);
      if (this.codecs[codec]) {
        this.decode(buffer)
      } else {
        await this.encode(buffer)
      }
    }
    if (typeof buffer === 'string') {
      if (this.isHex(buffer)) this.fromHex(buffer)
      if (this.isBase32(buffer)) this.fromBs32(buffer)
    }
    if (typeof buffer === 'object') this.fromJSON(buffer)
  }

  decode(buffer) {
    this.encoded = buffer
    const codec = varint.decode(buffer);

    this.discoCodec = new Codec(codec, this.codecs)
    // TODO: validate codec
    buffer = buffer.slice(varint.decode.bytes);
    this.size = varint.decode(buffer);
    this.digest = buffer.slice(varint.decode.bytes);
    if (this.digest.length !== this.size) {
      throw new Error(`hash length inconsistent: 0x${this.encoded.toString('hex')}`)
    }

    // const discoCodec = new Codec(codec, this.codecs)

    this.name = this.discoCodec.name


    this.size = this.digest.length

    return {
      codec: this.codec,
      name: this.name,
      size: this.size,
      length: this.length,
      digest: this.digest,
    }
  }
}
