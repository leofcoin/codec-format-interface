import { BinaryReader, BinaryWriter, varUintLength } from '@leofcoin/binary'
import { utils as codecUtils } from '@leofcoin/codecs'
import { createSHA1, createSHA224, createSHA256, createSHA384, createSHA512 } from 'hash-wasm'
import BasicInterface from './basic-interface.js'
import Codec from './codec.js'

const createHasher = (hashVariant: number) => {
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
      throw new Error(`unsupported hash variant: ${hashVariant}`)
  }
}

const digestBuffer = async (
  hashVariant: number,
  buffer: ArrayBuffer | Uint8Array
): Promise<Uint8Array> => {
  const view = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer)
  const hasher = await createHasher(hashVariant)
  hasher.init()
  hasher.update(view)
  const digest = hasher.digest('binary')
  return digest instanceof Uint8Array ? digest : new Uint8Array(digest)
}

type CodecHashOptions = {
  name?: string
  codecs?: object
}

const hashHeader = (buffer: Uint8Array) => {
  if (!(buffer instanceof Uint8Array)) throw new TypeError('CodecHash only supports Uint8Array input')
  const reader = new BinaryReader(buffer)
  const first = reader.readVarUint(false)
  const second = reader.readVarUint(false)
  const lengthFirstName = codecUtils.getCodecName(second)
  const codecFirstName = codecUtils.getCodecName(first)
  // Both headers have the same cursor. If both layouts match, first === second,
  // so their codec, size and digest are identical; there is no ambiguous state.
  if (lengthFirstName && first === reader.remaining)
    return { name: lengthFirstName, size: first, offset: reader.position }
  if (codecFirstName && second === reader.remaining)
    return { name: codecFirstName, size: second, offset: reader.position }
  if (!lengthFirstName && !codecFirstName) throw new Error('unknown hash codec')
  throw new Error('hash length inconsistent')
}

const hasHashHeader = (buffer: Uint8Array) => {
  const reader = new BinaryReader(buffer)
  try {
    if (codecUtils.getCodecName(reader.readVarUint(false))) return true
    return Boolean(codecUtils.getCodecName(reader.readVarUint(false)))
  } catch (error) {
    if (!(error instanceof RangeError)) throw error
    return false
  }
}

export default class CodecHash extends BasicInterface {
  codec: Uint8Array
  discoCodec: Codec
  size: number
  digest: Uint8Array
  codecs: object
  constructor(options: CodecHashOptions = { name: 'disco-hash', codecs: {} }) {
    super()
    if (options?.name) this.name = options.name
    else this.name = 'disco-hash'
    this.codecs = options?.codecs ?? {}
  }

  async init(uint8Array: Uint8Array) {
    if (uint8Array) {
      if (!(uint8Array instanceof Uint8Array)) {
        throw new Error('CodecHash only supports Uint8Array input')
      }
      if (hasHashHeader(uint8Array)) {
        this.decode(uint8Array)
      } else {
        await this.encode(uint8Array)
      }
    }
    return this
  }

  #clearEncodingCache() {
    for (const key of ['_bs32', '_hex', '_string']) delete this[key]
  }
  get prefix() {
    const length = this.length
    const uint8Array = new Uint8Array(length.length + this.discoCodec.codecBuffer.length)
    uint8Array.set(length)
    uint8Array.set(this.discoCodec.codecBuffer, length.length)

    return uint8Array
  }

  get length() {
    return new BinaryWriter(varUintLength(this.size)).writeVarUint(this.size).finish()
  }

  get buffer() {
    return this.encoded
  }

  get hash() {
    return this.encoded
  }

  async encode(buffer, name?) {
    if (!this.name && name) this.name = name
    if (!buffer) throw new Error('buffer is required for encoding')
    this.discoCodec = new Codec(this.name)
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

    this.#clearEncodingCache()
    this.decoded = undefined
    this.encoded = uint8Array

    return this.encoded
  }

  async validate(buffer: Uint8Array) {
    if (!(buffer instanceof Uint8Array)) {
      throw new Error('CodecHash only supports Uint8Array input')
    }
    await this.init(buffer)
  }

  decode(buffer?: Uint8Array) {
    buffer = buffer ?? this.encoded
    // Validate completely before changing this instance, including cached encodings.
    const header = hashHeader(buffer)
    const codec = new Codec(header.name)
    const digest = new Uint8Array(buffer.subarray(header.offset))
    this.#clearEncodingCache()
    this.encoded = buffer
    this.discoCodec = codec
    this.codec = codec.codecBuffer
    this.name = header.name
    this.size = header.size
    this.digest = digest
    const decoded = {
      codec: this.codec,
      name: this.name,
      size: this.size,
      length: this.length,
      digest: this.digest
    }
    this.decoded = decoded
    return decoded
  }
}
