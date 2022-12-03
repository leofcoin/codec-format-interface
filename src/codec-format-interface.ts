import BasicInterface from './basic-interface.js'
import Hash from './codec-hash.js'
import Codec from './codec.js';

export default class FormatInterface extends BasicInterface implements FormatInterface {
  async init(buffer) {
    if (buffer instanceof Uint8Array) await this.fromUint8Array(buffer)
    else if (buffer instanceof ArrayBuffer) await this.fromArrayBuffer(buffer)
    else if (buffer?.name === this.name) return buffer
    else if (buffer instanceof String) {
      if (this.isHex(buffer)) await this.fromHex(buffer)
      else if (this.isBase32(buffer)) await this.fromBs32(buffer)
      else if (this.isBase58(buffer)) await this.fromBs58(buffer)
      else throw new Error(`unsupported string ${buffer}`)
    } else {
      await this.create(buffer)
    }
    return this
  }

  hasCodec() {
    if (!this.encoded) return false
    const codec = new Codec(this.encoded)
    if (codec.name) return true
  }

  async decode() {
    let encoded = this.encoded;
    const codec = new Codec(this.encoded)
    if (codec.codecBuffer) {
      encoded = encoded.slice(codec.codecBuffer.length)
      this.name = codec.name
      this.decoded = await this.protoDecode(encoded)
      try {
        this.decoded = JSON.parse(this.decoded)
      } catch {
        
      }
    } else {
      throw new Error(`no codec found`)
    }
    
    return this.decoded
  }

  
  async encode(decoded?: object | string) {
    let encoded: Uint8Array
    if (!decoded) decoded = this.decoded;
    const codec = new Codec(this.name)

    if (decoded instanceof Uint8Array) encoded = decoded
    else encoded = await this.protoEncode(typeof decoded === 'object' ? JSON.stringify(decoded) : decoded)

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
   * @param {Object} proto - {encode, decode}
   * @param {Object} options - {hashFormat, name}
   */
  constructor(buffer, proto, options = {}) {
    super()
    this.proto = proto
    this.hashFormat = options.hashFormat || 'bs32'
    if (options.name) this.name = options.name
    return this.init(buffer)
  }

  /**
   * @return {PeernetHash}
   */
  get peernetHash() {
    return new Hash(this.decoded, {name: this.name})
  }

  /**
   * @return {peernetHash}
   */
  async hash() {
    const upper = this.hashFormat.charAt(0).toUpperCase()
    const format = `${upper}${this.hashFormat.substring(1, this.hashFormat.length)}`
    return (await this.peernetHash)[`to${format}`]()
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
}
