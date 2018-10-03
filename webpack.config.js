const webpack = require('webpack')

const config = {
  devtool: 'source-map',
  module: {
    rules: [
     {
        test: /\.(js)$/,
        exclude: /node_modules/,
        loader: 'babel-loader'
     }
    ]
  }
}

const library = Object.assign({}, config, {
  entry: './src/index.js',
  output: {
    path: __dirname + '/web',
    filename: 'cosmic-lib.js',
    library: 'cosmicLib',
    libraryTarget: 'umd',
    globalObject: 'typeof self !== \'undefined\' ? self : this'
  },
  externals: { 'stellar-sdk': 'stellar-sdk' }
})

const debug = Object.assign({}, config, {
  entry: './extra/debug.js',
  output: {
    path: __dirname + '/web',
    filename: 'debug.js',
    library: 'debug',
    libraryTarget: 'var'
  },
})

module.exports = [ debug, library ]
