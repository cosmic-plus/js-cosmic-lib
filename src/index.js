'use strict'

const envIsBrowser = require('ticot-box/envIsBrowser')
const envIsNode = require('ticot-box/envIsNode')

if (envIsBrowser()) {
  require('ticot-box/polyfill')
  require('../extra/cosmic-lib.css')
} else if (envIsNode() && typeof StellarSdk === 'undefined') {
  global.StellarSdk = require('stellar-sdk')
}

exports.CosmicLink = require('./cosmiclink')
exports.defaults = require('./defaults')
exports.specs = require('./specs')
