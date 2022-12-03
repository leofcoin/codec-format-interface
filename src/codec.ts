import varint from 'varint';
import codecs from './codecs.js'
import BasicInterface from './basic-interface.js'

export default class Codec extends BasicInterface {
  get codecs() {
    return {...globalThis.peernet.codecs, ...codecs}
  }
  constructor(buffer) {
    super()
    if (buffer) {
      if (buffer instanceof Uint8Array) {
        const codec = varint.decode(buffer);
        const name = this.getCodecName(codec)
        if (name) {
          this.name = name
          this.encoded = buffer
          this.decode(buffer)
        } else {
          this.encode(buffer)
        }
      } else if (buffer instanceof ArrayBuffer) {
        const encoded = new Uint8Array(buffer.byteLength)

        for (let i = 0; i < buffer.byteLength; i++) {
          encoded[i] = buffer[i]
        }
        this.encoded = encoded
        // this.encoded = new Uint8Array(buffer, buffer.byteOffset, buffer.byteLength)
        this.decode(buffer)
        return
      }
      if (typeof buffer === 'string') {
        if (this.codecs[buffer]) this.fromName(buffer)
        else if (this.isHex(buffer)) this.fromHex(buffer)
        else if (this.isBase32(buffer)) this.fromBs32(buffer)
        else if (this.isBase58(buffer)) this.fromBs58(buffer)
        else throw new Error(`unsupported string ${buffer}`)
      }
      if (!isNaN(buffer)) if (this.codecs[this.getCodecName(buffer)]) this.fromCodec(buffer)
    }
  }

  fromEncoded(encoded) {
    const codec = varint.decode(encoded);
    const name = this.getCodecName(codec)
    this.name = name
    this.encoded = encoded
    this.decode(encoded)
  }

  getCodec(name) {
    return this.codecs[name].codec
  }

  getCodecName(codec) {
    return Object.keys(this.codecs).reduce((p, c) => {
      const item = this.codecs[c]
      if (item.codec === codec) return c;
      else return p;
    }, undefined)
  }

  getHashAlg(name) {
    return this.codecs[name].hashAlg
  }

  fromCodec(codec) {
    this.name = this.getCodecName(codec)
    this.hashAlg = this.getHashAlg(this.name)

    this.codec = this.getCodec(this.name)
    this.codecBuffer = varint.encode(codec)
  }

  fromName(name) {
    const codec = this.getCodec(name)
    this.name = name
    this.codec = codec
    this.hashAlg = this.getHashAlg(name)
    this.codecBuffer = varint.encode(codec)
  }

  decode() {
    const codec = varint.decode(this.encoded);
    this.fromCodec(codec)
  }

  encode() {
    const codec = varint.encode(this.decoded)
    this.encoded = codec
    return this.encoded
  }
}
