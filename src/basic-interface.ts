import base32 from '@vandeurenglenn/base32'
import base58 from '@vandeurenglenn/base58'
import type { base58String } from '@vandeurenglenn/base58'
import type { base32String } from '@vandeurenglenn/base32'
import isHex from '@vandeurenglenn/is-hex'
import proto from '@vandeurenglenn/proto-array'
import {
  fromBase32,
  fromBase58,
  fromString,
  fromHex,
  fromArrayLike,
  fromUintArrayString,
  toBase32,
  toBase58,
  toHex
} from '@vandeurenglenn/typed-array-utils'

const BASE64_CHUNK_SIZE = 0x8000

const uint8ArrayToBase64 = (value: Uint8Array): string => {
  if (typeof Buffer !== 'undefined') return Buffer.from(value).toString('base64')
  let binary = ''
  for (let offset = 0; offset < value.length; offset += BASE64_CHUNK_SIZE) {
    const slice = value.subarray(offset, offset + BASE64_CHUNK_SIZE)
    binary += String.fromCharCode(...slice)
  }
  return btoa(binary)
}

const base64ToUint8Array = (value: string): Uint8Array => {
  if (typeof Buffer !== 'undefined') return new Uint8Array(Buffer.from(value, 'base64'))
  const binary = atob(value)
  const output = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) output[i] = binary.charCodeAt(i)
  return output
}

export const jsonStringifyBigInt = (key, value) => {
  if (typeof value === 'bigint') return { $bigint: value.toString() }
  if (value instanceof Uint8Array) return { $uint8array: uint8ArrayToBase64(value) }
  return value
}

export const jsonParseBigInt = (key, value) => {
  if (typeof value === 'object' && value) {
    if (value.$bigint) return BigInt(value.$bigint)
    if (value.$uint8array) return base64ToUint8Array(value.$uint8array)
  }
  return value
}

const _textEncoder = new TextEncoder()
const _textDecoder = new TextDecoder()

export default class BasicInterface {
  #encoded: Uint8Array
  #decoded: object
  name: string
  #proto: object

  get keys() {
    // handles proto keys
    // protokey -> key
    return Object.keys(this.#proto).map((key) => (key.endsWith('?') ? key.split('?')[0] : key))
  }

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
  }

  get proto() {
    return this.#proto
  }

  decode(encoded?: Uint8Array): Object {
    encoded = encoded || this.encoded
    // Example: decode as JSON if possible (override in subclass)
    try {
      return JSON.parse(_textDecoder.decode(encoded), jsonParseBigInt)
    } catch {
      return new Object()
    }
  }

  encode(decoded?: object): Uint8Array {
    decoded = decoded || this.decoded
    // Example: encode as JSON (override in subclass)
    return _textEncoder.encode(JSON.stringify(decoded, jsonStringifyBigInt))
  }
  // get Codec(): Codec {}

  // Cache proto keys/values for reuse
  static _protoCache = new WeakMap<object, { keys: string[]; values: any[] }>()

  protoEncode(data: object): Uint8Array {
    let cache = BasicInterface._protoCache.get(this.proto)
    if (!cache) {
      cache = {
        keys: Object.keys(this.proto),
        values: Object.values(this.proto)
      }
      BasicInterface._protoCache.set(this.proto, cache)
    }
    // Use proto.encode directly, but avoid new array allocations inside encode if possible
    return proto.encode(this.proto, data, false)
  }

  protoDecode(data: Uint8Array): object {
    // Use a static output object if possible (not thread-safe, but safe for single-threaded use)
    if (!this._decodeOutput) this._decodeOutput = {}
    const result = proto.decode(this.proto, data, false)
    // Copy properties to static object to avoid new allocations
    Object.keys(result).forEach((k) => {
      this._decodeOutput[k] = result[k]
    })
    // Remove any keys not in result
    Object.keys(this._decodeOutput).forEach((k) => {
      if (!(k in result)) delete this._decodeOutput[k]
    })
    return this._decodeOutput
  }

  isHex(string: string): boolean {
    return isHex(string)
  }
  isBase32(string: string): boolean {
    return base32.isBase32(string)
  }
  isBase58(string: string): boolean {
    return base58.isBase58(string)
  }

  fromBs32(encoded: string): object {
    return this.decode(base32.decode(encoded))
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
    const arrayLike = array.map((string) => Number(string))
    return this.decode(Uint8Array.from(arrayLike))
  }

  fromHex(string: string): object {
    return this.decode(fromHex(string))
  }

  fromArray(array: number[]): object {
    // Avoid unnecessary copy if already Uint8Array
    if (array instanceof Uint8Array) return this.decode(array)
    return this.decode(Uint8Array.from(array))
  }

  fromEncoded(encoded: Uint8Array) {
    return this.decode(encoded)
  }

  toString(): string {
    if (!this.encoded) this.encode()
    // Use cached string if available
    if (!this._string) this._string = Array.prototype.join.call(this.encoded, ',')
    return this._string
  }

  toHex(): string {
    if (!this.encoded) this.encode()
    // Use cached hex if available
    if (!this._hex) {
      if (!this._string) this._string = Array.prototype.join.call(this.encoded, ',')
      this._hex = toHex(this._string.split(',').map(Number))
    }
    return this._hex
  }

  /**
   * @return {String} encoded
   */
  toBs32(): base32String {
    if (!this.encoded) this.encode()
    // Use cached bs32 if available
    if (!this._bs32) this._bs32 = toBase32(this.encoded)
    return this._bs32
  }

  /**
   * @return {String} encoded
   */
  toBs58(): base58String {
    if (!this.encoded) this.encode()
    return toBase58(this.encoded)
  }
}
