'use_strict'
/**
 * Library-wide configuration.
 *
 * @exports config
 */
const config = exports

const StellarSdk = require('@cosmic-plus/base/stellar-sdk')

const aliases = require('./aliases')
const event = require('./event')

/**
 * The base URI to build cosmic links.
 * @default 'https://cosmic.link/'
 */
config.page = 'https://cosmic.link/'
/**
 * The default fallback network.
 * @default 'public'
 */
config.network = 'public'
/**
 * The default horizon node URL. Will guess it from `config.network` if undefined.
 * @default undefined
 */
config.horizon = undefined
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
 * Set default `passphrase` and `horizon` url for network `name`.
 *
 * Adding custom network this way will enable the use of their name in cosmic
 * queries (as in '&network=name'). However, please remind that this feature
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

config.setupNetwork('public', 'https://horizon.stellar.org', StellarSdk.Networks.PUBLIC)
config.setupNetwork('test', 'https://horizon-testnet.stellar.org', StellarSdk.Networks.TESTNET)

/**
 * Aliases for most known Stellar addresses. Aliases are used instead of
 * public keys when displaying addresses. This is purely for conveniency: they
 * are not a way of tying an account to an address as federated addresses are.
 * The aliases object is formed as follow:
 *
 * ```
 * {
 *   'publicKey1': 'name1',
 *   'publicKey2': 'name2',
 *    ...
 *   'publicKeyN': 'nameN'
 * }
 * ```
 */
config.aliases = aliases.all

/**
 * Add new aliases or replace existing ones.
 *
 * @param {Object} definitions An object such as `{ publicKey1: name1, ..., publicKeyN: nameN }`
 */
config.addAliases = function (definitions) { aliases.add(config, definitions) }

/**
 * Remove aliases.
 *
 * @param {Array} array An array such as `[ publicKey1, ..., publicKeyN ]`
 */
config.removeAliases = function (array) { aliases.remove(config, array) }

/**
 * Set the click handler for `fieldType` HTML elements as `callback`.
 *
 * @example
 * cosmicLib.config.setClickHandler('address', showAddressPopup)
 * @example
 * cosmicLink.setClickHandler('asset', showAssetBox)
 *
 * @param {string} fieldType Type of a transaction/operation field such as
 *     `address`, `asset`, `hash`, ...
 * @param {function} callback A function that accept one `event` argument
 */
config.setClickHandler = function (fieldType, callback) {
  event.setClickHandler(config, fieldType, callback)
}

/**
 * Remove the current click handler for `fieldType`.
 *
 * @example
 * cosmicLib.config.clearClickHandler('address')
 * @example
 * cosmicLink.clearClickHandler('asset')
 *
 * @param {string} fieldType Type of a transaction/operation field such as
 *     `address`, `asset`, `hash`, ...
 */
config.clearClickHandler = function (fieldType) {
  event.clearClickHandler(config, fieldType)
}

/**
 * The active click handlers. Can be defined globally (`cosmicLib.config.clickhandlers`)
 * or for a particular CosmicLink object (`cosmicLink.clickHandlers`). Takes the
 * form:
 *
 * ```
 * cosmicLib.config.clickHandlers = {
 *   fieldType1: callback1,
 *   ...
 *   fieldTypeN: callbackN
 * }
 * ```
 *
 * Thoses click handlers are set by default:
 *
 * ```
 *  address: 'A prompt that show the address',
 *  asset: 'A function that show the asset issuer',
 *  hash: 'A function that copy the hash into the clipboard or show a prompt
 *     box to enter preimage signature when relevant'
 * ```
 */
config.clickHandlers = event.defaultClickHandlers
