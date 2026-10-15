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

export default class CodecHash extends BasicInterface {
  codec: Uint8Array
  discoCodec: Codec
  size: number
  codecs: object
  constructor(options: CodecHashOptions = { name: 'disco-hash', codecs: {} }) {
    super()
    if (options?.name) this.name = options.name
    else this.name = 'disco-hash'
    if (options?.codecs) this.codecs = options.codecs
  }

  async init(uint8Array: Uint8Array) {
    if (uint8Array) {
      if (!(uint8Array instanceof Uint8Array)) {
        throw new Error('CodecHash only supports Uint8Array input')
      }
      // For large buffers, only check first bytes for codec prefix
      // Codec prefixes are small (varint encoded), so 100 bytes is more than enough
      const checkBuffer = uint8Array.length > 100 ? uint8Array.subarray(0, 100) : uint8Array
      // Probe only the numeric prefix. Raw payloads need not be textual codec IDs.
      let name: string | undefined
      try {
        name = codecUtils.getCodecName(new BinaryReader(checkBuffer).readVarUint(false))
      } catch (error) {
        // A raw payload may start with arbitrary bytes, not a valid integer header.
        // Decoding a recognized hash below still fails closed on malformed fields.
        if (!(error instanceof RangeError)) throw error
      }

      if (name) {
        this.discoCodec = new Codec(name)
        this.name = name
        this.decode(uint8Array)
      } else {
        await this.encode(uint8Array)
      }
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

    this.encoded = uint8Array

    return this.encoded
  }

  async validate(buffer: Uint8Array) {
    if (!(buffer instanceof Uint8Array)) {
      throw new Error('CodecHash only supports Uint8Array input')
    }
    const codec = new BinaryReader(buffer).readVarUint(false)
    if (this.codecs[codec]) {
      this.decode(buffer)
    } else {
      await this.encode(buffer)
    }
  }

  decode(buffer) {
    this.encoded = buffer
    const reader = new BinaryReader(buffer)
    const codec = reader.readVarUint(false)

    this.discoCodec = new Codec(codec)
    // TODO: validate codec
    this.size = reader.readVarUint(false)
    this.digest = buffer.slice(reader.position)
    if (this.digest.length !== this.size) {
      throw new Error(`hash length inconsistent: 0x${this.encoded.toString()}`)
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
