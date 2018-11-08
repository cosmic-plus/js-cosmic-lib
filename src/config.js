"use_strict"
/**
 * Library-wide configuration.
 *
 * @borrows module:aliases.all as aliases
 * @borrows module:aliases.add as addAliases
 * @borrows module:aliases.remove as removeAliases
 *
 * @borrows module:event.defaultClickHandlers as clickHandlers
 * @borrows module:event.setClickHandler as setClickHandler
 * @borrows module:event.clearClickHandler as clearClickHandler
 *
 * @exports config
 */
const config = exports

const env = require("@cosmic-plus/jsutils/env")
const StellarSdk = require("@cosmic-plus/base/stellar-sdk")

const aliases = require("./aliases")
const event = env.isBrowser && require("./event")

/**
 * The base URI to build cosmic links.
 * @default 'https://cosmic.link/'
 */
config.page = "https://cosmic.link/"
/**
 * The default fallback network.
 * @default 'public'
 */
config.network = "public"
/**
 * The default fallback source address.
 * @default undefined
 */
config.source = undefined

/**
 * Networks setup.
 *
 * @private
 */
config.current = {
  passphrase: {},
  horizon: {},
  server: {}
}

/**
 * Set default **passphrase** and **horizon** URL for network **name**.
 *
 * Adding custom network this way will enable the use of their name in cosmic
 * queries (as in `&network=name`). However, please remind that this feature
 * will works only on your side and could break compatibility with other
 * services.
 *
 * @example
 * cosmicLib.config.setupNetwork('public', 'https://my-own-horizon-instance.example.org')
 * cosmicLib.config.setupNetwork('custom', 'https://custom-horizon.example.org', 'My Custom Passphrase')
 *
 * @param {string} name Network name (like 'public', 'test')
 * @param {string} horizon Horizon URL
 * @param {string} [passphrase] Network passphrase
 */
config.setupNetwork = function (name, horizon, passphrase) {
  if (passphrase) config.current.passphrase[name] = passphrase
  else passphrase = config.current.passphrase[name]
  config.current.horizon[passphrase] = horizon
}

config.setupNetwork("public", "https://horizon.stellar.org", StellarSdk.Networks.PUBLIC)
config.setupNetwork("test", "https://horizon-testnet.stellar.org", StellarSdk.Networks.TESTNET)

config.aliases = aliases.all
config.addAliases = (definitions) => aliases.add(config, definitions)
config.removeAliases = (array) => aliases.remove(config, array)

config.clickHandlers = event.defaultClickHandlers
config.setClickHandler = (fieldType, callback) => event.setClickHandler(config, fieldType, callback)
config.clearClickHandler = (fieldType) => event.clearClickHandler(config, fieldType)
