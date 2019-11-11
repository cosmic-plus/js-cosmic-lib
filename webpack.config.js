const library = {
  entry: "./es5/index.js",
  output: {
    path: __dirname + "/web",
    filename: "cosmic-lib.js",
    library: "cosmicLib",
    libraryTarget: "umd",
    globalObject: "typeof self !== 'undefined' ? self : this"
  },
  devtool: "source-map"
}

const SideFrame = {
  entry: "./es5/helpers/side-frame.js",
  output: {
    path: __dirname + "/web",
    filename: "side-frame.js",
    library: "SideFrame",
    libraryTarget: "umd",
  },
  devtool: "source-map"
}

const debug = {
  entry: "./test/debug.js",
  output: {
    path: __dirname + "/web",
    filename: "debug.js",
    library: "debug",
    libraryTarget: "var"
  },
  devtool: "source-map"
}

module.exports = [debug, library, SideFrame]
