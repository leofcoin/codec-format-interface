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

## Hash header compatibility

`CodecHash` continues to encode **length, codec, digest**, byte-for-byte compatible
with existing hashes. Its decoder also accepts the legacy **codec, length, digest**
layout. It requires a registered codec and an exact digest-length match before
updating the instance; unknown codecs, truncated headers and trailing bytes are
rejected. Legacy padded integer prefixes remain readable. Decoding preserves the
original bytes, including header order and padding, rather than rewriting hashes.

Use `await hash.encode(rawBytes)` for raw content and `hash.decode(encodedHash)`
for strict parsing of serialized hashes. `init()` and `validate()` retain automatic
raw/hash detection for compatibility, so they should not replace `decode()` when
validating untrusted serialized hashes. Raw bytes can resemble a hash header;
`FormatInterface` hashes its content through the explicit raw-content path.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT
