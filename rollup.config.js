import typescript from '@rollup/plugin-typescript'
import tsConfig from './tsconfig.json' assert { type: 'json' }

export default [{
  input: ['src/index.ts'],
  output: [{
    file: 'dist/index.js',
    format: 'es'
  }],
  plugins: [
    typescript(tsConfig)
  ]
}]
