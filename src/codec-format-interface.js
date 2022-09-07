import BasicInterface from './basic-interface.js'
import Codec from './codec.js';
import Hash from './codec-hash.js'

export default class FormatInterface extends BasicInterface {

  async protoEncode(data) {
    // check schema
    return new TextEncoder().encode(data)
  }

  async protoDecode(data) {
    // check schema
    return new TextDecoder().decode(data)
  }

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
  get hash() {
    const upper = this.hashFormat.charAt(0).toUpperCase()
    const format = `${upper}${this.hashFormat.substring(1, this.hashFormat.length)}`
    return this.peernetHash[`to${format}`]()
  }

  /**
   * @return {Object}
   */
  async decode() {
    let encoded = this.encoded;
    const discoCodec = new Codec(this.encoded)
    encoded = encoded.slice(discoCodec.codecBuffer.length)
    this.name = discoCodec.name
    this.decoded = await this.protoDecode(encoded)
    try {
      this.decoded = JSON.parse(this.decoded)
    } catch {
      
    }
    return this.decoded
  }

  /**
   * @return {Buffer}
   */
  async encode(decoded) {
    let encoded
    if (!decoded) decoded = this.decoded;
    const codec = new Codec(this.name)

    if (decoded instanceof Uint8Array) encoded = decoded
    else encoded = await this.protoEncode(typeof decoded === 'object' ? JSON.stringify(decoded) : decoded)

    const uint8Array = new Uint8Array(encoded.length + codec.codecBuffer.length)
    uint8Array.set(codec.codecBuffer)
    uint8Array.set(encoded, codec.codecBuffer.length)

    this.encoded = uint8Array
    return this.encoded
  }

  hasCodec() {
    if (!this.encoded) return false
    const codec = new Codec(this.encoded)
    if (codec.name) return true
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
