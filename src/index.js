'use strict'

const env = require('@cosmic-plus/jsutils/env')

if (env.isBrowser) {
  require('@cosmic-plus/jsutils/polyfill')
  require('../extra/cosmic-lib.css')
}

exports.CosmicLink = require('./cosmiclink')
exports.config = require('./config')
exports.specs = require('./specs')
