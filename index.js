'use strict'

require('./polyfill')

if (typeof document !== 'undefined') {
  /// Web
  require('./extra/cosmic-lib.css')
} else if (typeof StellarSdk === 'undefined') {
  /// Node
  global.StellarSdk = require('stellar-sdk')
}

exports.CosmicLink = require('./cosmiclink').CosmicLink
exports.defaults = require('./defaults')
exports.specs = require('./specs')
