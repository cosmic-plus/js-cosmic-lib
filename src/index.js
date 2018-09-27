'use strict'

const env = require('@cosmic-plus/jsutils/env')
const helpers = require('@cosmic-plus/jsutils/misc')

if (env.isBrowser) require('@cosmic-plus/jsutils/polyfill')

/**
 * Automatically pass `config` to `module` functions as first argument.
 *
 * @param {Object} config A configuration object similar than config.js module.
 * @param {Object} module A cosmic-lib module whose functions takes config as the
 *   first argument.
 * @private
 */
function exposeModule (config, module) {
  const layer = Object.assign({}, module)
  helpers.setHiddenProperty(layer, '_config', config)
  for (let name in module) {
    if (typeof module[name] === 'function') {
      layer[name] = function (...params) { return module[name](this._config, ...params) }
    } else {
      layer[name] = module[name]
    }
  }
  return layer
}

/**
 * Create a clone of the library with an alternative config object derived from
 * `params`. Fields which are not defined in `params` stay in sync with parent
 * configuration.
 *
 * @example
 * const testnet = cosmicLib.withConfig({ network: 'test })
 *
 * @params {Object} params Alternative configuration
 * @return {Object} A clone of cosmicLib
 */
exports.withConfig = function (params) {
  const library = Object.create(this)
  library.config = Object.assign({}, this.config, params)

  for (let module in this) {
    if (this[module].prototype && this[module].prototype.__proto__ === this.config) {
      library[module] = class extends this[module] {}
      Object.assign(library[module].prototype, this[module].prototype)
      library[module].prototype.__proto__ = library.config
    } else if (this[module]._config) {
      library[module] = Object.create(this[module])
      helpers.setHiddenProperty(library[module], '_config', library.config)
    }
  }

  return library
}

/// Export modules.

const config = exports.config = require('./config')
exports.CosmicLink = require('./cosmiclink')
exports.load = exposeModule(config, require('./load'))
exports.resolve = exposeModule(config, require('./resolve'))
exports.specs = require('./specs')
