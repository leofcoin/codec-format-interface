import BasicInterface from './basic-interface.js'
import Codec from './codec.js';
import Hash from './codec-hash.js'

export default class FormatInterface extends BasicInterface {
  /**
   * @param {Buffer|String|Object} buffer - data - The data needed to create the desired message
   * @param {Object} proto - {encode, decode}
   * @param {Object} options - {hashFormat, name}
   */
  constructor(buffer, proto, options = {}) {
    super()
    this.protoEncode = proto.encode
    this.protoDecode = proto.decode
    this.hashFormat = options.hashFormat || 'bs32'
    if (options.name) this.name = options.name
    if (buffer instanceof Uint8Array) this.fromUint8Array(buffer)
    else if (buffer instanceof ArrayBuffer) this.fromArrayBuffer(buffer)
    else if (buffer.name === options.name) return buffer
    else if (buffer instanceof String) {
      if (this.isHex(buffer)) this.fromHex(buffer)
      else if (this.isBase32(buffer)) this.fromBs32(buffer)
      else if (this.isBase58(buffer)) this.fromBs58(buffer)
      else throw new Error(`unsupported string ${buffer}`)
    } else {
      this.create(buffer)
    }
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
  decode() {
    let encoded = this.encoded;
    const discoCodec = new Codec(this.encoded)
    encoded = encoded.slice(discoCodec.codecBuffer.length)
    this.name = discoCodec.name
    this.decoded = this.protoDecode(encoded)
    return this.decoded
  }

  /**
   * @return {Buffer}
   */
  encode(decoded) {
    if (!decoded) decoded = this.decoded;
    const codec = new Codec(this.name)
    const encoded = this.protoEncode(decoded)
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
    if (!this.hasCodec()) this.create(
      JSON.parse(new TextDecoder().decode(this.encoded))
    )
    else this.decode()
  }

  fromArrayBuffer(buffer) {
    this.encoded = new Uint8Array(buffer, buffer.byteOffset, buffer.byteLength)
    if (!this.hasCodec()) this.create(
      JSON.parse(new TextDecoder().decode(this.encoded))
    )
    else this.decode()
  }
}
