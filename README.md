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

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT