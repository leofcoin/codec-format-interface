import varint from 'varint'
import { CID } from 'multiformats/cid'
import { createSHA1, createSHA224, createSHA256, createSHA384, createSHA512 } from 'hash-wasm'
import BasicInterface, { jsonStringifyBigInt } from './basic-interface.js'
import Codec from './codec.js'

const MAX_WEBCRYPTO_INPUT = 0x7fffffff
const STREAMING_CHUNK_SIZE = 64 * 1024 * 1024

const toUint8Array = (buffer: ArrayBuffer | Uint8Array): Uint8Array =>
  buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer)

const getStreamingHasher = async (hashVariant: number) => {
  switch (hashVariant) {
    case 1:
      return createSHA1()
    case 224:
      return createSHA224()
    case 256:
      return createSHA256()
    case 384:
      return createSHA384()
    case 512:
      return createSHA512()
    default:
      return null
  }
}

const digestBuffer = async (hashVariant: number, buffer: ArrayBuffer | Uint8Array) => {
  const view = toUint8Array(buffer)
  if (view.byteLength >= MAX_WEBCRYPTO_INPUT) {
    const hasher = await getStreamingHasher(hashVariant)
    if (!hasher) {
      throw new Error(`unsupported streaming hash variant: ${hashVariant}`)
    }
    hasher.init()
    for (let offset = 0; offset < view.byteLength; offset += STREAMING_CHUNK_SIZE) {
      const end = Math.min(offset + STREAMING_CHUNK_SIZE, view.byteLength)
      hasher.update(view.subarray(offset, end))
    }
    const digest = hasher.digest('binary')
    return digest instanceof Uint8Array ? digest : new Uint8Array(digest)
  }
  const sourceView =
    view.byteOffset === 0 && view.byteLength === view.buffer.byteLength ? view : view.slice()
  const digest = await crypto.subtle.digest(`SHA-${hashVariant}`, sourceView.buffer)
  return new Uint8Array(digest)
}

const parseCid = (input: string | Uint8Array | ArrayBuffer): CID | null => {
  try {
    if (typeof input === 'string') return CID.parse(input)
    const bytes = input instanceof Uint8Array ? input : new Uint8Array(input)
    return CID.decode(bytes)
  } catch {
    return null
  }
}

type CodecHashOptions = {
  name: string
  codecs: object
}

export default class CodecHash extends BasicInterface {
  codec: Uint8Array
  discoCodec: Codec
  size: number
  constructor(buffer, options: CodecHashOptions) {
    super()
    if (options?.name) this.name = options.name
    else this.name = 'disco-hash'
    if (options?.codecs) this.codecs = options.codecs
    return this.init(buffer)
  }

  async init(uint8Array) {
    if (uint8Array) {
      const cid =
        typeof uint8Array === 'string'
          ? parseCid(uint8Array)
          : uint8Array instanceof Uint8Array || uint8Array instanceof ArrayBuffer
            ? parseCid(uint8Array)
            : null
      if (cid) {
        await this.fromCID(cid)
        return this
      }
      if (uint8Array instanceof Uint8Array) {
        this.discoCodec = new Codec(uint8Array)
        const name = this.discoCodec.name

        if (name) {
          this.name = name
          this.decode(uint8Array)
        } else {
          await this.encode(uint8Array)
        }
      }

      if (typeof uint8Array === 'string') {
        if (this.isHex(uint8Array)) await this.fromHex(uint8Array)
        if (this.isBase32(uint8Array)) await this.fromBs32(uint8Array)
        else if (this.isBase58(uint8Array)) await this.fromBs58(uint8Array)
        else throw new Error(`unsupported string ${uint8Array}`)
      } else if (typeof uint8Array === 'object') await this.fromJSON(uint8Array)
    }
    return this
  }
  get prefix() {
    const length = this.length
    const uint8Array = new Uint8Array(length.length + this.discoCodec.codecBuffer.length)
    uint8Array.set(length)
    uint8Array.set(this.discoCodec.codecBuffer, length.length)

    return uint8Array
  }

  get length() {
    return varint.encode(this.size)
  }

  get buffer() {
    return this.encoded
  }

  get hash() {
    return this.encoded
  }

  fromJSON(json) {
    return this.encode(new TextEncoder().encode(JSON.stringify(json, jsonStringifyBigInt)))
  }

  async encode(buffer, name?) {
    if (!this.name && name) this.name = name
    if (!buffer) buffer = this.buffer
    this.discoCodec = new Codec(this.name)
    this.discoCodec.fromName(this.name)
    let hashAlg = this.discoCodec.hashAlg
    const hashVariant = Number(hashAlg.split('-')[hashAlg.split('-').length - 1])

    if (hashAlg.includes('dbl')) {
      hashAlg = hashAlg.replace('dbl-', '')
      buffer = await digestBuffer(hashVariant, buffer)
    }
    this.digest = await digestBuffer(hashVariant, buffer)

    this.size = this.digest.length

    this.codec = this.discoCodec.encode()
    this.codec = this.discoCodec.codecBuffer
    const uint8Array = new Uint8Array(this.digest.length + this.prefix.length)
    uint8Array.set(this.prefix)
    uint8Array.set(this.digest, this.prefix.length)

    this.encoded = uint8Array

    return this.encoded
  }

  async fromCID(cid: CID | string | Uint8Array | ArrayBuffer) {
    const parsed =
      cid instanceof CID
        ? cid
        : typeof cid === 'string' || cid instanceof Uint8Array
          ? parseCid(cid)
          : parseCid(cid as ArrayBuffer)
    if (!parsed) throw new Error('invalid cid input')

    if (!this.name) this.name = 'disco-hash'
    this.discoCodec = new Codec(this.name)
    this.discoCodec.fromName(this.name)

    this.digest = parsed.multihash.digest
    this.size = this.digest.length

    this.codec = this.discoCodec.encode()
    this.codec = this.discoCodec.codecBuffer

    const uint8Array = new Uint8Array(this.digest.length + this.prefix.length)
    uint8Array.set(this.prefix)
    uint8Array.set(this.digest, this.prefix.length)
    this.encoded = uint8Array
    return this.encoded
  }

  async validate(buffer) {
    if (Buffer.isBuffer(buffer)) {
      const codec = varint.decode(buffer)
      if (this.codecs[codec]) {
        this.decode(buffer)
      } else {
        await this.encode(buffer)
      }
    }
    if (typeof buffer === 'string') {
      if (this.isHex(buffer)) this.fromHex(buffer)
      if (this.isBase32(buffer)) this.fromBs32(buffer)
    }
    if (typeof buffer === 'object') this.fromJSON(buffer)
  }

  decode(buffer) {
    this.encoded = buffer
    const codec = varint.decode(buffer)

    this.discoCodec = new Codec(codec, this.codecs)
    // TODO: validate codec
    buffer = buffer.slice(varint.decode.bytes)
    this.size = varint.decode(buffer)
    this.digest = buffer.slice(varint.decode.bytes)
    if (this.digest.length !== this.size) {
      throw new Error(`hash length inconsistent: 0x${this.encoded.toString('hex')}`)
    }

    // const discoCodec = new Codec(codec, this.codecs)

    this.name = this.discoCodec.name

    this.size = this.digest.length

    return {
      codec: this.codec,
      name: this.name,
      size: this.size,
      length: this.length,
      digest: this.digest
    }
  }
}
