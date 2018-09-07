'use strict'
/**
 * Contains functions that probe the blockchain or federation servers to collect
 * datas.
 *
 * @private
 * @exports resolve
 */
const resolve = exports

const status = require('./status')

const helpers = require('ticot-box/misc')

/**
 * Returns the Server object for `horizon` if specified, else for `network`,
 * else for `cosmicLib.config.network`.
 *
 * @param {string} [network] 'public', 'test' or a network passphrase
 * @param {string} [horizon] A horizon URL
 * @returns {Server} A StellarSdk Server object
 */
resolve.server = function (conf, network = conf.network, horizon = conf.horizon) {
  const passphrase = networkPassphrase(conf, network)
  if (!passphrase) throw new Error('No network selected.')
  return getServer(conf, passphrase, horizon)
}

/**
 * Switch to network `network` if it is given, else switch to
 * `cosmicLib.config.network`.
 *
 * @param {string} [network] 'public', 'test' or a network passphrase
 * @param {string} [horizon] A horizon instance URL
 * @returns {Server} A StellarSdk Server object
 */
resolve.network = function (conf, network = conf.network, horizon = conf.horizon) {
  const passphrase = networkPassphrase(conf, network)
  if (passphrase !== networkPassphrase()) {
    console.log('Switch to network: ' + network)
    StellarSdk.Network.use(new StellarSdk.Network(passphrase))
  }
}

/**
 * Returns the passphrase for `network` if it is given, else or for the current
 * network.
 *
 * @private
 */
function networkPassphrase (conf, network) {
  if (network) {
    return conf.current.passphrase[network] || network
  } else {
    const currentNetwork = StellarSdk.Network.current()
    if (currentNetwork) return currentNetwork.networkPassphrase()
  }
}

/**
 * Returns the StellarSdk Server object for `horizon` if it is given, else
 * returns the default StellarSdk Server object for network `passphrase`.
 *
 * @private
 */
function getServer (conf, passphrase, horizon = conf.current.horizon[passphrase]) {
  if (!conf.current.server[horizon]) conf.current.server[horizon] = new StellarSdk.Server(horizon)
  return conf.current.server[horizon]
}

/**
 * Returns the federation server response for `address`.
 *
 * @async
 * @param {string} address A Stellar public key or a federated address
 * @return {Promise} Resolve to federation server response
 */
resolve.address = function (conf, address) {
  const cache = conf.cache
  if (cache && cache.destination && cache.destination[address]) {
    return cache.destination[address]
  }

  const promise = addressResolver(conf, address)
  if (cache && cache.destination) cache.destination[address] = promise
  return promise
}

async function addressResolver (conf, address) {
  if (address.length !== 56 && !address.match(/.*\*.*\..*/)) {
    status.fail(conf, 'Invalid address(es)')
    status.error(conf, 'Invalid address: ' + helpers.shorter(address), 'throw')
  }

  try {
    const account = await StellarSdk.FederationServer.resolve(address)
    const accountId = account.account_id
    if (!accountId) throw new Error('Unknow address')
    if (!account.memo_type) delete account.memo
    if (address !== accountId) account.address = address
    if (conf.aliases) account.alias = conf.aliases[accountId]
    return account
  } catch (error) {
    console.error(error)
    status.fail(conf, 'Unresolved address(es)')
    status.error(conf, "Can't resolve: " + helpers.shorter(address), 'throw')
  }
}

/**
 * Returns the AccountResponse object for `address`.
 *
 * @param {string} address A public key or a federated address
 * @return {Object} The AccountResponse
 */
resolve.account = async function (conf, address) {
  const account = await resolve.address(conf, address)
  const accountId = account.account_id
  const cache = conf.cache
  if (cache && cache.account && cache.account[accountId]) {
    return cache.account[accountId]
  }

  const promise = accountResolver(conf, accountId)
  if (cache && cache.account) cache.account[accountId] = promise
  return promise
}

async function accountResolver (conf, accountId) {
  const server = resolve.server(conf)
  try {
    const accountResponse = await server.loadAccount(accountId)
    return accountResponse
  } catch (error) {
    console.error(error)
    const short = helpers.shorter(accountId)
    status.error(conf, `Empty account: ${short}`, 'throw')
  }
}

/**
 * Returns the source AccountResponse object for `cosmicLink`
 *
 * @param {CL}
 * @return {Object} The account response
 */
resolve.getSourceAccount = async function (cosmicLink) {
  const source = await cosmicLink.getSource()
  try {
    const account = await resolve.account(cosmicLink, source)
    return account
  } catch (error) {
    status.fail(cosmicLink, 'Empty source account', 'throw')
  }
}

resolve.signers = require('./signers')

resolve.transaction = async function (conf, txHash) {
  const callBuilder = resolve.server(conf).transactions()
  return callBuilder.transaction(txHash).call()
}
