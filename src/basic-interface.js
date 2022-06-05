import bs32 from '@vandeurenglenn/base32';
import bs58 from '@vandeurenglenn/base58';
import isHex from '@vandeurenglenn/is-hex';

export default class BasicInterface {
  #handleDecode() {
    if (!this.decode) throw new Error('bad implementation: needs decode func')
    return this.decode()
  }

  #handleEncode() {
    if (!this.encode) throw new Error('bad implementation: needs encode func')
    return this.encode()
  }
  isHex(string) {
    return isHex(string)
  }
  isBase32(string) {
    return base32.isBase32(string)
  }
  isBase58(string) {
    return base58.isBase32(string)
  }
  /**
   * @param {String} encoded
   */
  fromBs32(encoded) {
    this.encoded = bs32.decode(encoded)
    return this.#handleDecode()
  }

  /**
   * @param {String} encoded
   */
  fromBs58(encoded) {
    this.encoded = bs58.decode(encoded)
    return this.#handleDecode()
  }

  async toArray() {
    const array = []
    for await (const value of this.encoded.values()) {
      array.push(value)
    }
    return array
  }

  fromString(string) {
    this.encoded = new Uint8Array(string.split(','))
    return this.#handleDecode()
  }

  fromArray(array) {
    this.encoded = new Uint8Array([...array])
    return this.#handleDecode()
  }

  /**
   * @param {Buffer} encoded
   */
  fromEncoded(encoded) {
    this.encoded = encoded
    return this.#handleDecode()
  }

  /**
   * @param {String} encoded
   */
  fromHex(encoded) {
    this.encoded = Buffer.from(encoded, 'hex')
    return this.#handleDecode()
  }

  async toString(encoding = 'utf8') {
    if (!this.encoded) await this.#handleEncode()
    return this.encoded.toString(encoding)
  }

  /**
   * @return {String} encoded
   */
  toHex() {
    return this.toString('hex')
  }

  /**
   * @return {String} encoded
   */
  async toBs32() {
    if (!this.encoded) await this.#handleEncode()
    return bs32.encode(this.encoded)
  }

  /**
   * @return {String} encoded
   */
  async toBs58() {
    if (!this.encoded) await this.#handleEncode()
    return bs58.encode(this.encoded)
  }

  /**
   * @param {Object} data
   */
  create(data) {
    const decoded = {}
    if (this.keys?.length > 0) {
      for (const key of this.keys) {
        Object.defineProperties(decoded, {
          [key]: {
            enumerable: true,
            configurable: true,
            set: (val) => value = data[key],
            get: () => data[key]
          }
        })
      }

      this.decoded = decoded
      return this.encode()
    }
  }
}
