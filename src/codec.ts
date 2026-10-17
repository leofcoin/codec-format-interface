import { BinaryReader, BinaryWriter, varUintLength } from '@leofcoin/binary'
import { utils as codecUtils } from '@leofcoin/codecs'
import BasicInterface from './basic-interface.js'

export default class Codec extends BasicInterface {
  codecBuffer: Uint8Array
  codec: number
  hashAlg: string

  constructor(buffer: string | number | object | Uint8Array | ArrayBuffer) {
    super()
    if (buffer) {
      if (buffer instanceof Uint8Array) {
        const codec = new BinaryReader(buffer).readVarUint(false)
        const name = this.getCodecName(codec)
        if (name) {
          this.name = name
          this.encoded = buffer
          this.decode(buffer)
        } else {
          this.encode(Number(new TextDecoder().decode(buffer)))
        }
      } else if (buffer instanceof ArrayBuffer) {
        const view = new Uint8Array(buffer)
        const codec = new BinaryReader(view).readVarUint(false)
        const name = this.getCodecName(codec)
        if (name) {
          this.name = name
          this.decode(view)
        } else {
          this.encode(Number(new TextDecoder().decode(new Uint8Array(buffer))))
        }
      } else if (typeof buffer === 'string') {
        if (codecUtils.getCodec(buffer)) this.fromName(buffer)
        else if (this.isHex(buffer)) this.fromHex(buffer)
        else if (this.isBase32(buffer)) this.fromBs32(buffer)
        else if (this.isBase58(buffer)) this.fromBs58(buffer)
        else this.fromString(buffer)
      } else if (typeof buffer === 'number') {
        if (codecUtils.getCodec(buffer)) this.fromCodec(buffer)
      }
    }
  }

  fromEncoded(encoded: Uint8Array): object {
    const codec = new BinaryReader(encoded).readVarUint(false)
    const name = this.getCodecName(codec)
    this.name = name
    this.encoded = encoded
    return this.decode(encoded)
  }

  getCodec(name: string): number {
    return codecUtils.getCodec(name)
  }

  getCodecName(codec: number): string {
    return codecUtils.getCodecName(codec)
  }

  getHashAlg(name: string): string {
    return codecUtils.getHashAlg(name)
  }

  fromCodec(codec: number) {
    this.name = this.getCodecName(codec)
    this.hashAlg = this.getHashAlg(this.name)
    this.codec = this.getCodec(this.name)
    this.codecBuffer = new BinaryWriter(varUintLength(this.codec)).writeVarUint(this.codec).finish()
    this.decoded = {
      name: this.name,
      hashAlg: this.hashAlg,
      codec: this.codec,
      codecBuffer: this.codecBuffer
    }
  }

  fromName(name: string) {
    const codec = this.getCodec(name)
    this.name = name
    this.codec = codec
    this.hashAlg = this.getHashAlg(name)
    this.codecBuffer = new BinaryWriter(varUintLength(this.codec)).writeVarUint(this.codec).finish()
    this.decoded = {
      name: this.name,
      hashAlg: this.hashAlg,
      codec: this.codec,
      codecBuffer: this.codecBuffer
    }
  }

  decode(encoded?: Uint8Array): object {
    encoded = encoded || this.encoded
    const codec = new BinaryReader(encoded).readVarUint(false)
    this.fromCodec(codec)
    return this.decoded
  }

  encode(codec?: number): Uint8Array {
    codec = codec || this.codec
    this.encoded = new BinaryWriter(varUintLength(codec)).writeVarUint(codec).finish()
    return this.encoded
  }
}
