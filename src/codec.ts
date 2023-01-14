import varint from 'varint';
import codecs from './codecs.js'
import BasicInterface from './basic-interface.js'

export default class Codec extends BasicInterface {
  codecBuffer: Uint8Array
  codec: number
  hashAlg: string

  get codecs() {
    const globalCodecs = globalThis.peernet?.codecs || {}
    return { ...globalCodecs, ...codecs }
  }
  constructor(buffer: string | number | object | Uint8Array | ArrayBuffer) {
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
        const codec = varint.decode(buffer);
        const name = this.getCodecName(codec)
        if (name) {
          this.name = name
          this.decode(buffer as Uint8Array)
        } else {
          this.encode(buffer)
        }
      } else if (typeof buffer === 'string') {
        if (this.codecs[buffer]) this.fromName(buffer)
        else if (this.isHex(buffer)) this.fromHex(buffer)
        else if (this.isBase32(buffer)) this.fromBs32(buffer)
        else if (this.isBase58(buffer)) this.fromBs58(buffer)
        else throw new Error(`unsupported string ${buffer}`)
      }
      if (!isNaN(buffer as number)) if (this.codecs[this.getCodecName(buffer as number)]) this.fromCodec(buffer)
    }
  }

  fromEncoded(encoded: Uint8Array): object {
    const codec = varint.decode(encoded);
    const name = this.getCodecName(codec)
    this.name = name
    this.encoded = encoded
    return this.decode(encoded)
  }

  getCodec(name: string): number {
    return this.codecs[name].codec
  }

  getCodecName(codec: number): string {
    return Object.keys(this.codecs).reduce((p, c) => {
      const item = this.codecs[c]
      if (item.codec === codec) return c;
      else return p;
    }, undefined)
  }

  getHashAlg(name: string): string {
    return this.codecs[name].hashAlg
  }

  fromCodec(codec: number) {
    this.name = this.getCodecName(codec)
    this.hashAlg = this.getHashAlg(this.name)

    this.codec = this.getCodec(this.name)
    this.codecBuffer = varint.encode(codec)
  }

  fromName(name: string) {
    const codec = this.getCodec(name)
    this.name = name
    this.codec = codec
    this.hashAlg = this.getHashAlg(name)
    this.codecBuffer = varint.encode(codec)
  }

  decode(encoded?: Uint8Array): object {
    encoded = encoded || this.encoded
    const codec = varint.decode(encoded);
    this.fromCodec(codec)
    return this.decoded
  }

  encode(codec?: number): Uint8Array {
    codec = codec || this.codec    
    this.encoded = varint.encode(codec)
    return this.encoded
  }
}
