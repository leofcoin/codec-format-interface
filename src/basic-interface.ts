import bs32 from '@vandeurenglenn/base32';
import base58 from '@vandeurenglenn/base58';
import isHex from '@vandeurenglenn/is-hex';
import proto from '@vandeurenglenn/proto-array'
import { fromBase32, fromBase58, fromString, fromHex, fromArrayLike, fromUintArrayString, toBase32, toBase58, toHex } from '@vandeurenglenn/typed-array-utils'


export default class BasicInterface {
  encoded: Uint8Array;
  decoded: object | string;
  keys: string[]
  name: string
  // get Codec(): Codec {}

  protoEncode(data: object): Uint8Array {
    // check schema
    
    return proto.encode(this.proto, data)
  }

  protoDecode(data: Uint8Array): object {
    // check schema
    return proto.decode(this.proto, data)
  }

  isHex(string: any) {
    return isHex(string)
  }
  isBase32(string: any) {
    return bs32.isBase32(string)
  }
  isBase58(string: any) {
    return base58.isBase58(string)
  }

  fromBs32(encoded: base58String): object {
    this.encoded = bs32.decode(encoded)
    return this.decode()
  }


  fromBs58(encoded: any): object {
    this.encoded = fromBase58(encoded)
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

  fromHex(string) {
    this.encoded = fromHex(string)
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

  toString(): string {
    if (!this.encoded) this.encode()
    return this.encoded.toString()
  }

  toHex() {
    if (!this.encoded) this.encode()
    return toHex(this.encoded)
  }

  /**
   * @return {String} encoded
   */
  toBs32() {
    if (!this.encoded) this.encode()
    return toBase32(this.encoded)
  }

  /**
   * @return {String} encoded
   */
  toBs58() {
    if (!this.encoded) this.encode()
    return toBase58(this.encoded)
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
