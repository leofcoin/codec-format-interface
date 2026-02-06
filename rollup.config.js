import typescript from '@rollup/plugin-typescript'

export default [
  {
    input: [
      'src/index.ts',
      'src/basic-interface.ts',
      'src/codec-format-interface.ts',
      'src/codec.ts',
      'src/codec-hash.ts'
    ],
    output: [
      {
        dir: 'exports',
        format: 'es',
        sourcemap: true,
        entryFileNames: '[name].js'
      },
      {
        dir: 'exports',
        format: 'cjs',
        sourcemap: true,
        entryFileNames: 'cjs/[name].js'
      }
    ],
    plugins: [typescript()]
  }
]
