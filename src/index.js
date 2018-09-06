'use strict'

const env = require('ticot-box/env')

if (env.isBrowser) {
  require('ticot-box/polyfill')
  require('../extra/cosmic-lib.css')
} else if (env.isNode && typeof StellarSdk === 'undefined') {
  global.StellarSdk = require('stellar-sdk')
}

exports.CosmicLink = require('./cosmiclink')
exports.config = require('./config')
exports.specs = require('./specs')
