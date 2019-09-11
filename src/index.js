"use strict"

const env = require("@cosmic-plus/jsutils/es5/env")
const misc = require("@cosmic-plus/jsutils/es5/misc")
if (env.isBrowser) require("@cosmic-plus/domutils/es5/polyfill")

/**
 * Automatically pass `config` to `module` functions as first argument.
 *
 * @param {Object} module A cosmic-lib module whose functions takes config as
 *   the first argument.
 * @param {Object} config A configuration object similar than config.js module.
 * @private
 */
function exposeModule (module, config = {}) {
  const layer = Object.assign({}, module)
  misc.setHiddenProperty(layer, "_config", config)
  for (let name in module) {
    if (typeof module[name] === "function") {
      layer[name] = function (...params) {
        return module[name](this._config, ...params)
      }
    } else {
      layer[name] = module[name]
    }
  }
  return layer
}

/**
 * Create a clone of the library with an alternative config object derived from
 * **params**. Fields which are not defined in **params** stay in sync with parent
 * configuration.
 *
 * @example
 * const testnet = cosmicLib.withConfig({ network: 'test' })
 * const account = await testnet.resolve.account('tips*cosmic.link')
 *
 * @params {Object} params Alternative configuration
 * @return {Object} A clone of cosmicLib
 */
exports.withConfig = function (params) {
  const library = Object.create(this)
  library.config = Object.assign({}, this.config, params)

  for (let module in this) {
    if (
      this[module].prototype
      && this[module].prototype.__proto__ === this.config
    ) {
      library[module] = class extends this[module] {}
      Object.assign(library[module].prototype, this[module].prototype)
      library[module].prototype.__proto__ = library.config
    } else if (this[module]._config) {
      library[module] = Object.create(this[module])
      misc.setHiddenProperty(library[module], "_config", library.config)
    }
  }

  return library
}

/**
 * Export modules **names** after linking them to `config`.
 *
 * @param  {...String} names Module names
 */
function exportModule (name, module) {
  exports[name] = exposeModule(module, config)
}

// Export modules.

const config = exports.config = require("./config")
exports.CosmicLink = require("./cosmiclink")
if (env.isBrowser) exports.load = require("./load")
exportModule("resolve", require("./resolve"))
exportModule("signersUtils", require("./signers-utils"))
exports.specs = require("./specs")

// sep7Utils
const { registerWebHandler } = require("./sep7-utils")
exports.sep7Utils = { registerWebHandler }

// Export helpers (not documented in the manual - please check the code).
exportModule("check", require("./check"))
exportModule("expand", require("./expand"))
exportModule("construct", require("./construct"))
exportModule("destruct", require("./destruct"))
exportModule("encode", require("./encode"))
exportModule("decode", require("./decode"))
