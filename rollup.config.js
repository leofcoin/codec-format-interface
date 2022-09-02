import resolve from 'rollup-plugin-node-resolve'
import commonjs from 'rollup-plugin-commonjs'
export default [{
  input: ['src/index.js'],
  output: [{
    dir: 'dist',
    format: 'cjs'
  }]
}, {
  input: ['src/index.js'],
  output: [{
    file: 'dist/module.js',
    format: 'es'
  }],
  plugins: [
    commonjs(),
    resolve()
  ]
}]
