import BasicInterface from './basic-interface.js'
import Codec from './codec.js';
import Hash from './codec-hash.js';

export default class FormatInterface extends BasicInterface implements FormatInterface {
  hashFormat: string
  #hash

  init(buffer: Uint8Array | ArrayBuffer | FormatInterface | string) {
    if (buffer instanceof Uint8Array) this.fromUint8Array(buffer)
    else if (buffer instanceof ArrayBuffer) this.fromArrayBuffer(buffer)
    else if (buffer instanceof FormatInterface && buffer?.name === this.name) return buffer
    else if (typeof buffer === 'string') {
      if (this.isHex(buffer as string)) this.fromHex(buffer as string)
      else if (this.isBase58(buffer as string)) this.fromBs58(buffer as base58String)
      else if (this.isBase32(buffer as string)) this.fromBs32(buffer as string)
      else this.fromString(buffer as string)
    } else {
      this.create(buffer as object)
    }
    return this
  }

  hasCodec() {
    if (!this.encoded) return false
    const codec = new Codec(this.encoded)
    if (codec.name) return true
  }

  decode(encoded?: Uint8Array): object {
    encoded = encoded || this.encoded;
    const codec = new Codec(encoded)
    if (codec.codecBuffer) {
      encoded = encoded.slice(codec.codecBuffer.length)
      this.name = codec.name
      this.decoded = this.protoDecode(encoded)
      // try {
      //   this.decoded = JSON.parse(this.decoded)
      // } catch {
        
      // }
    } else {
      throw new Error(`no codec found`)
    }
    
    return this.decoded
  }

  
  encode(decoded?: object) {
    let encoded: Uint8Array
    decoded = decoded || this.decoded;
    const codec = new Codec(this.name)

    if (decoded instanceof Uint8Array) encoded = decoded
    else encoded = this.protoEncode(decoded)

    if (codec.codecBuffer) {
      const uint8Array = new Uint8Array(encoded.length + codec.codecBuffer.length)
      uint8Array.set(codec.codecBuffer)
      uint8Array.set(encoded, codec.codecBuffer.length)
      this.encoded = uint8Array
    } else {
      throw new Error(`invalid codec`)
    }
    return this.encoded
  }
  /**
   * @param {Buffer|String|Object} buffer - data - The data needed to create the desired message
   * @param {Object} proto - {protoObject}
   * @param {Object} options - {hashFormat, name}
   */
  constructor(buffer, proto, options?: { hashFormat?: string, name?: string }) {
    super()
    this.proto = proto
    this.hashFormat = options?.hashFormat ? options.hashFormat : 'bs32'
    
    if (options?.name) this.name = options.name

    this.init(buffer)
  }

  get format() {
    const upper = this.hashFormat.charAt(0).toUpperCase()
    return `${upper}${this.hashFormat.substring(1, this.hashFormat.length)}`
  }

  /**
   * @return {PeernetHash}
   */
  get peernetHash() {
    const decoded = this.decoded
    // @ts-ignore
    delete decoded.hash
    return new Hash(decoded, {name: this.name})
  }

  /**
   * @return {peernetHash}
   */
  async hash() {
    if (this.#hash) return this.#hash
    const upper = this.hashFormat.charAt(0).toUpperCase()
    const format = `${upper}${this.hashFormat.substring(1, this.hashFormat.length)}`
    this.#hash = (await this.peernetHash)[`to${format}`]()
    return this.#hash
  }

  fromUint8Array(buffer) {
    this.encoded = buffer
    return this.hasCodec() ? this.decode() : this.create(
      JSON.parse(new TextDecoder().decode(this.encoded))
    )
  }

  fromArrayBuffer(buffer) {
    this.encoded = new Uint8Array(buffer, buffer.byteOffset, buffer.byteLength)
    return this.hasCodec() ? this.decode() : this.create(
      JSON.parse(new TextDecoder().decode(this.encoded))
    )
  }

  /**
   * @param {Object} data
   */
  create(data: object): Uint8Array {
    const decoded = {}
    if (data.hash) this.#hash = data.hash
    if (this.keys?.length > 0) {
      for (const key of this.keys) {
        decoded[key] = data[key]
      }
      this.decoded = decoded
      return this.encode(decoded)
    }
  }
}
