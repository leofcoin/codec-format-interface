# codec-format-interface

TypeScript/JavaScript interface for defining and working with codec formats.

## Usage

```js
import FormatInterface from '@leofcoin/codec-format-interface'

class MyFormat extends FormatInterface {
  get proto() {
    return {
      key: 'value',
      hello: 'world'
    }
  }

  constructor(data) {
    super(data, { name: 'my-format', hashFormat: 'bs32' })
  }
}
```

## API

- **FormatInterface**: Base class for creating custom codec formats.
  - `constructor(data, options)`: Initialize with data and options.
  - `proto`: Getter for the protocol definition.
  - `toBs58()`, `toBs32()`, `hash()`: Encoding and hashing utilities.

## Build for Browser

### Rollup Example
```js
import resolve from '@rollup/plugin-node-resolve'
import typescript from '@rollup/plugin-typescript'

export default {
  input: 'src/index.ts',
  output: {
    dir: 'exports',
    format: 'es'
  },
  plugins: [
    resolve(),
    typescript()
  ]
}
```

## Canonical hash header (breaking change in 2.0)

`CodecHash` exclusively encodes and decodes this layout:

```text
[codec: canonical unsigned varint][digest byte length: canonical unsigned varint][digest]
```

The length counts only the digest bytes, not the codec or header. The decoder
requires a registered codec and an exact digest-length match before updating the
instance. Unknown codecs, padded/non-minimal varints, truncated headers, missing
digest bytes and trailing bytes are rejected. There is no length-first fallback.
Hash algorithms and digest bytes are unchanged, but serialized hashes and their
Base32/Base58 representations change from the 1.x length-first format.

This is a coordinated protocol migration, not a drop-in dependency update.
Consumers must explicitly adopt 2.x together. Content-addressed contracts, blocks,
transactions and genesis references must be regenerated consistently; existing
chainstate must not be mixed with the new format. Back up old state and retain
owner identities before a network reset. This package does not reset any state.

Use `await hash.encode(rawBytes)` for raw content and `hash.decode(encodedHash)`
for strict parsing of serialized hashes. `init()` and `validate()` retain automatic
raw/hash detection for compatibility, so they should not replace `decode()` when
validating untrusted serialized hashes. Raw bytes can resemble a hash header;
`FormatInterface` hashes its content through the explicit raw-content path.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT
