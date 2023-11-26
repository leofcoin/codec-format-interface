import bs32 from '@vandeurenglenn/base32';
import base58 from '@vandeurenglenn/base58';
import isHex from '@vandeurenglenn/is-hex';
import proto from '@vandeurenglenn/proto-array'
import { fromBase32, fromBase58, fromString, fromHex, fromArrayLike, fromUintArrayString, toBase32, toBase58, toHex } from '@vandeurenglenn/typed-array-utils'


export default class BasicInterface {
  #encoded: Uint8Array;
  #decoded: object;
  keys: string[]
  name: string
  #proto: object

  get encoded() {
    if (!this.#encoded) this.#encoded = this.encode()
    return this.#encoded
  }

  set encoded(value) {
    this.#encoded = value
  }

  get decoded() {
    if (!this.#decoded) this.#decoded = this.decode()
    return this.#decoded
  }

  set decoded(value) {
    this.#decoded = value
  }

  set proto(value) {
    this.#proto = value
    this.keys = Object.keys(value)
  }

  get proto() {
    return this.#proto
  }

  decode(encoded?: Uint8Array): Object {
    encoded = encoded || this.encoded
    return new Object()
  }

  encode(decoded?: object): Uint8Array {
    decoded = decoded || this.decoded
    return new Uint8Array()
  }
  // get Codec(): Codec {}

  protoEncode(data: object): Uint8Array {
    // check schema
    
    return proto.encode(this.proto, data, false)
  }

  protoDecode(data: Uint8Array): object {
    // check schema
    return proto.decode(this.proto, data, false)
  }

  isHex(string: string): boolean {
    return isHex(string)
  }
  isBase32(string: string): boolean {
    return bs32.isBase32(string)
  }
  isBase58(string: string): boolean {
    return base58.isBase58(string)
  }

  fromBs32(encoded: string): object {
    return this.decode(bs32.decode(encoded))
  }


  fromBs58(encoded: base58String): object {
    return this.decode(fromBase58(encoded))
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
    return this.decode(Uint8Array.from(arrayLike))
  }

  fromHex(string: string): object {
    return this.decode(fromHex(string))
  }

  fromArray(array: number[]): object {
    return this.decode(Uint8Array.from([...array]))
  }

  fromEncoded(encoded: Uint8Array) {
    return this.decode(encoded)
  }

  toString(): string {
    if (!this.encoded) this.encode()
    return this.encoded.toString()
  }

  toHex(): string {
    if (!this.encoded) this.encode()
    return toHex(this.encoded.toString().split(',').map(number => Number(number)))
  }

  /**
   * @return {String} encoded
   */
  toBs32(): string {
    if (!this.encoded) this.encode()
    return toBase32(this.encoded)
  }

  /**
   * @return {String} encoded
   */
  toBs58(): base58String {
    if (!this.encoded) this.encode()
    return toBase58(this.encoded)
  }
}
