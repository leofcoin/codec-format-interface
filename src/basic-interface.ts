import bs32 from '@vandeurenglenn/base32';
import base58 from '@vandeurenglenn/base58';
import isHex from '@vandeurenglenn/is-hex';


export default class BasicInterface implements basicInterface {
  encoded: Uint8Array;
  decoded: object | string;
  keys: string[]
  name: string
  // get Codec(): Codec {}

  async protoEncode(data: string): Promise<Uint8Array> {
    // check schema
    return new TextEncoder().encode(data)
  }

  async protoDecode(data: Uint8Array): Promise<string> {
    // check schema
    return new TextDecoder().decode(data)
  }

  decode: () => DecodeResult;
  
  encode:() => Promise<Uint8Array>;

  isHex(string: any) {
    return isHex(string)
  }
  isBase32(string: any) {
    return bs32.isBase32(string)
  }
  isBase58(string: any) {
    return base58.isBase58(string)
  }

  fromBs32(encoded: base58): DecodeResult {
    this.encoded = bs32.decode(encoded)
    return this.decode()
  }


  fromBs58(encoded: any): DecodeResult {
    this.encoded = base58.decode(encoded)
    return this.decode()
  }

  async toArray() {
    const array: number[] = []
    for await (const value of this.encoded.values()) {
      array.push(value)
    }
    return array
  }

  fromString(string: string): object {
    const array: string[] = string.split(',')
    const arrayLike = array.map(string => Number(string))
    this.encoded = Uint8Array.from(arrayLike)
    return this.decode()
  }

  fromArray(array: number[]): object {
    this.encoded = Uint8Array.from([...array])
    return this.decode()
  }

  fromEncoded(encoded: Uint8Array) {
    this.encoded = encoded
    return this.decode()
  }

  fromHex(encoded: string): Promise<string | object> {
    this.encoded = Buffer.from(encoded, 'hex')
    return this.decode()
  }

  async toString(encoding: string = 'utf8'): Promise<string> {
    if (!this.encoded) await this.encode()
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
    if (!this.encoded) await this.encode()
    return bs32.encode(this.encoded)
  }

  /**
   * @return {String} encoded
   */
  async toBs58() {
    if (!this.encoded) await this.encode()
    return base58.encode(this.encoded)
  }

  /**
   * @param {Object} data
   */
  create(data: object) {
    const decoded = {}
    if (this.keys?.length > 0) {
      for (const key of this.keys) {
        Object.defineProperties(decoded, {
          [key]: {
            enumerable: true,
            configurable: true,
            set: (value) => value = data[key],
            get: () => data[key]
          }
        })
      }
      this.decoded = decoded
      return this.encode()
    }
  }
}
