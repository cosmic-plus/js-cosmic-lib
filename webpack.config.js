const config = {
  devtool: "source-map",
  module: {
    rules: [
      {
        test: /\.(html|svg)$/,
        loader: "raw-loader"
      }
    ]
  }
}

const library = Object.assign({}, config, {
  entry: "./es5/index.js",
  output: {
    path: __dirname + "/web",
    filename: "cosmic-lib.js",
    library: "cosmicLib",
    libraryTarget: "umd",
    globalObject: "typeof self !== 'undefined' ? self : this"
  }
})

const debug = Object.assign({}, config, {
  entry: "./test/debug.js",
  output: {
    path: __dirname + "/web",
    filename: "debug.js",
    library: "debug",
    libraryTarget: "var"
  }
})

module.exports = [debug, library]
