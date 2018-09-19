'use strict'
/**
 * Contains functions that probe the blockchain or federation servers to collect
 * datas.
 *
 * @private
 * @exports resolve
 */
const resolve = exports

const helpers = require('@cosmic-plus/jsutils/misc')
const StellarSdk = require('@cosmic-plus/base/stellar-sdk')

const specs = require('./specs')
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
  if (!horizon) {
    const passphrase = resolve.networkPassphrase(conf, network)
    if (!passphrase) throw new Error('No network selected.')
    horizon = conf.current.horizon[passphrase]
    if (!horizon) throw new Error('No horizon node defined for selected network.')
  }
  if (!conf.current.server[horizon]) conf.current.server[horizon] = new StellarSdk.Server(horizon)
  return conf.current.server[horizon]
}

/**
 * Switch to network `network` if it is given, else switch to
 * `cosmicLib.config.network`. If an `horizon` URL is given, sets it as the
 * default horizon node for `network`.
 *
 * @param {string} [network] 'public', 'test' or a network passphrase
 * @param {string} [horizon] A horizon instance URL
 * @returns {Server} A StellarSdk Server object
 */
resolve.useNetwork = function (conf, network = conf.network, horizon) {
  const passphrase = resolve.networkPassphrase(conf, network)
  const currentPassphrase = resolve.networkPassphrase()
  if (passphrase !== currentPassphrase) {
    console.log('Switch to network: ' + network)
    StellarSdk.Network.use(new StellarSdk.Network(passphrase))
  }
  if (horizon) conf.current.horizon[passphrase] = horizon
}

/**
 * Returns the default Horizon node URL, or the Horizon node URL for `network`
 * if provided.
 *
 * @param {string} [network] A network name or passphrase.
 */
resolve.horizon = function (conf, network = conf.network) {
  const passphrase = resolve.networkPassphrase(conf, network)
  return conf.current.horizon[passphrase]
}

/**
 * Returns the passphrase for `network` if it is given, else or for the default
 * network.
 */
resolve.networkPassphrase = function (conf = {}, network = conf.network) {
  if (network) {
    return conf.current.passphrase[network] || network
  } else {
    const currentNetwork = StellarSdk.Network.current()
    if (currentNetwork) return currentNetwork.networkPassphrase()
  }
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
  try {
    const account = await StellarSdk.FederationServer.resolve(address)
    const accountId = account.account_id
    if (!accountId) throw new Error('Unknow address')
    if (!account.memo_type) delete account.memo
    if (address !== accountId) account.address = address
    if (conf.aliases && conf.aliases[accountId]) {
      account.alias = conf.aliases[accountId]
    }
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

resolve.txSource = async function (conf, address, sequence) {
  if (!address) {
    const neutralAccount = new StellarSdk.Account(specs.neutralAccountId, '0')
    neutralAccount.signers = [ specs.neutralAccountId ]
    if (conf.cache && conf.cache.account) {
      conf.cache.account[specs.neutralAccountId] = neutralAccount
    }
    return neutralAccount
  } else {
    const destination = await resolve.address(conf, address)
    if (destination.memo) status.error(conf, 'Invalid transaction source address (requires a memo)', 'throw')
    const account = await resolve.account(conf, destination.account_id)
    if (sequence) {
      const baseAccount = new StellarSdk.Account(account.id, sequence)
      baseAccount.sequence = baseAccount.sequence.sub(1)
      account._baseAccount = baseAccount
    }
    return account
  }
}

resolve.signers = require('./signers')

resolve.transaction = async function (conf, txHash) {
  const callBuilder = resolve.server(conf).transactions()
  return callBuilder.transaction(txHash).call()
}
