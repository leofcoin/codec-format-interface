import BasicInterface from './basic-interface.js'
import Hash from './codec-hash.js'
import Codec from './codec.js';

export default class FormatInterface extends BasicInterface implements FormatInterface {

  set proto(value) {
    this._proto = value
    this.keys = Object.keys(this._proto)
  }

  get proto() {
    return this._proto
  }
  init(buffer) {
    if (buffer instanceof Uint8Array) this.fromUint8Array(buffer)
    else if (buffer instanceof ArrayBuffer) this.fromArrayBuffer(buffer)
    else if (buffer?.name === this.name) return buffer
    else if (buffer instanceof String) {
      if (this.isHex(buffer)) this.fromHex(buffer)
      else if (this.isBase58(buffer)) this.fromBs58(buffer)
      else if (this.isBase32(buffer)) this.fromBs32(buffer)
      else throw new Error(`unsupported ${buffer}`)
    } else {
      this.create(buffer)
    }
    return this
  }

  hasCodec() {
    if (!this.encoded) return false
    const codec = new Codec(this.encoded)
    if (codec.name) return true
  }

  decode() {
    let encoded = this.encoded;
    const codec = new Codec(this.encoded)
    if (codec.codecBuffer) {
      encoded = encoded.slice(codec.codecBuffer.length)
      this.name = codec.name
      this.decoded = this.protoDecode(encoded)
      try {
        this.decoded = JSON.parse(this.decoded)
      } catch {
        
      }
    } else {
      throw new Error(`no codec found`)
    }
    
    return this.decoded
  }

  
  encode(decoded?: object) {
    let encoded: Uint8Array
    if (!decoded) decoded = this.decoded;
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
  constructor(buffer, proto, options = {}) {
    super()
    this.proto = proto
    this.hashFormat = options.hashFormat || 'bs32'
    if (options.name) this.name = options.name
    this.init(buffer)
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
