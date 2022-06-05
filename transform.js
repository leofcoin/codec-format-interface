const { readFile, writeFileSync } = require('fs')

readFile('dist/index.js', (error, data) => {
  data = data.toString()
  data = data.replace('exports.BasicInterface = basicInterface', 'exports.BasicInterface = basicInterface.default')
  data = data.replace('exports.Codec = codec', 'exports.Codec = codec.default')
  data = data.replace('exports.codecHash = codecHash', 'exports.codecHash = codecHash.default')
  data = data.replace('exports.FormatInterface = codecFormatInterface', 'exports.FormatInterface = codecFormatInterface.default')
  data = data.replace('exports.codecs = codecs$1', 'exports.codecs = codecs$1.default')

  writeFileSync('dist/index.js', data)
})
