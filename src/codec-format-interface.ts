import BasicInterface, { jsonParseBigInt } from './basic-interface.js'
import Codec from './codec.js'
import Hash from './codec-hash.js'

import type { base58String } from '@vandeurenglenn/base58'
import type { base32String } from '@vandeurenglenn/base32'
import type { HexString } from '@vandeurenglenn/is-hex'

export default class FormatInterface extends BasicInterface implements FormatInterface {
  hashFormat: string
  #hash
  #encoded

  get encoded() {
    return this.#encoded || this.encode()
  }

  set encoded(value) {
    this.#encoded = value
  }

  init(buffer: Uint8Array | ArrayBuffer | FormatInterface | string) {
    if (buffer instanceof FormatInterface && buffer?.name === this.name) {
      return buffer
    } else if (buffer instanceof Uint8Array) {
      this.fromUint8Array(buffer)
    } else if (buffer instanceof ArrayBuffer) {
      this.fromArrayBuffer(buffer)
    } else if (typeof buffer === 'string') {
      if (this.isHex(buffer as HexString)) this.fromHex(buffer as string)
      else if (this.isBase58(buffer as base58String)) this.fromBs58(buffer)
      else if (this.isBase32(buffer as base32String)) this.fromBs32(buffer)
      else this.fromString(buffer as string)
    } else if (typeof buffer === 'object' && buffer !== null) {
      this.create(buffer as object)
    } else {
      // Explicitly reject all other types (number, boolean, undefined, symbol, function, null)
      throw new TypeError(`Invalid input type for FormatInterface: ${typeof buffer}`)
    }
    return this
  }

  hasCodec() {
    if (!this.encoded) return false
    const codec = new Codec(this.encoded)
    if (codec.name) return true
  }

  decode(encoded?: Uint8Array): object {
    encoded = encoded || this.encoded
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
    decoded = decoded || this.decoded
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
  constructor(buffer, proto, options?: { hashFormat?: string; name?: string }) {
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
   * Extract content bytes without codec prefix
   */
  get contentBytes(): Uint8Array {
    if (!this.encoded) return new Uint8Array(0)
    const codec = new Codec(this.encoded)
    if (codec.codecBuffer) {
      return this.encoded.slice(codec.codecBuffer.length)
    }
    return this.encoded
  }

  beforeHashing(decoded: { [index: string]: any }) {
    // Avoid copying if not needed
    if (decoded && Object.prototype.hasOwnProperty.call(decoded, 'hash')) {
      // Only copy if hash is present
      const rest = { ...decoded }
      delete rest.hash
      return rest
    }
    return decoded
  }

  /**
   * @return {PeernetHash}
   */
  get peernetHash() {
    // Optimize: if decoded has no hash property, contentBytes are already correct
    // Since protoEncode is deterministic (varint-based), we can use them directly
    if (
      this.encoded &&
      this.decoded &&
      !Object.prototype.hasOwnProperty.call(this.decoded, 'hash')
    ) {
      // @ts-ignore
      const hash = new Hash({ name: this.name })
      return hash.init(this.contentBytes)
    }

    // Fallback: must re-encode without hash property
    const decoded = this.beforeHashing({ ...this.decoded })
    // @ts-ignore
    const hash = new Hash({ name: this.name })
    return hash.init(decoded)
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
    return this.hasCodec()
      ? this.decode()
      : this.create(JSON.parse(BasicInterface._textDecoder.decode(this.encoded), jsonParseBigInt))
  }

  fromArrayBuffer(buffer) {
    this.encoded = new Uint8Array(buffer, buffer.byteOffset, buffer.byteLength)
    return this.hasCodec()
      ? this.decode()
      : this.create(JSON.parse(BasicInterface._textDecoder.decode(this.encoded), jsonParseBigInt))
  }

  /**
   * @param {Object} data
   */
  create(data: object) {
    const decoded = {}
    // @ts-ignore
    if (data.hash) this.#hash = data.hash
    if (this.keys?.length > 0) {
      for (const key of this.keys) {
        decoded[key] = data[key]
      }
      this.decoded = decoded
      // return this.encode(decoded)
    }
  }
}
