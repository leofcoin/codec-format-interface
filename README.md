# codec-format-interface
 
## usage 

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
    super(data, { name: 'my-format', hashFormat = 'bs32' })
  }
}

```

## build for browser
### rollup
```js
import resolve from '@rollup/plugin-node-resolve'
...
  plugins: [
    resolve()
  ]
...
```