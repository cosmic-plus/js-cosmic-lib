'use strict'
/**
 * Contains functions that probe the blockchain or federation servers to collect
 * datas.
 *
 * @exports resolve
 */
const resolve = exports

const helpers = require('@cosmic-plus/jsutils/misc')
const StellarSdk = require('@cosmic-plus/base/stellar-sdk')

const specs = require('./specs')
const status = require('./status')

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
 * `cosmicLib.config.network`.
 *
 * @param {string} [network] 'public', 'test' or a network passphrase
 * @returns {Server} A StellarSdk Server object
 */
resolve.useNetwork = function (conf, network = conf.network) {
  const passphrase = resolve.networkPassphrase(conf, network)
  const currentPassphrase = resolve.networkPassphrase()
  if (passphrase !== currentPassphrase) {
    console.log('Switch to network: ' + network)
    StellarSdk.Network.use(new StellarSdk.Network(passphrase))
  }
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
  if (cache && cache.destination[address]) return cache.destination[address]

  const promise = addressResolver(conf, address)
  if (cache) cache.destination[address] = promise
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
    status.error(conf, "Can't resolve: " + helpers.shorter(address))
    status.fail(conf, 'Unresolved address', 'throw')
  }
}

/**
 * Returns the AccountResponse object for `address`.
 *
 * @param {string} address A public key or a federated address
 * @return {Object} The AccountResponse
 */
resolve.account = async function (conf, address, quietFlag) {
  const account = await resolve.address(conf, address)
  const accountId = account.account_id
  const cache = conf.cache
  if (cache && cache.account[accountId]) return cache.account[accountId]

  const promise = accountResolver(conf, accountId, quietFlag)
  if (cache) cache.account[accountId] = promise
  return promise
}

async function accountResolver (conf, accountId, quietFlag) {
  const server = resolve.server(conf)
  try {
    const accountResponse = await server.loadAccount(accountId)
    return accountResponse
  } catch (error) {
    if (quietFlag) {
      throw error
    } else {
      console.error(error)
      status.error(conf, 'Empty account: ' + helpers.shorter(accountId), 'throw')
    }
  }
}

/**
 * Returns `true` if `address` doesn't exist on the blockchain, `false`
 * otherwise.
 *
 * @async
 * @param {string} address Public key or federated address
 * @return {boolean}
 */
resolve.isAccountEmpty = function (conf, address) {
  return resolve.account(conf, address, true).then(x => false).catch(x => true)
}

/**
 * Returns the account object for transaction source `address`, with sequence
 * set at `sequence` if provided. If `address` is not provided, return the
 * neutral account object instead (as in SEP-0007 specifications).
 *
 * @param {string} [address]
 * @param {string|numbre} [sequence]
 * @return {AccountResponse}
 */
resolve.txSourceAccount = async function (conf, address, sequence) {
  if (!address) {
    const neutralAccount = new StellarSdk.Account(specs.neutralAccountId, '-1')
    neutralAccount.signers = []
    if (conf.cache) {
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

/**
 * Return an array of all source accounts involved in `transaction`.
 *
 * @param {Transaction} transaction
 * @return {Array}
 */
resolve.txSources = function (conf, transaction) {
  if (!transaction.source) throw new Error('No source for transaction')

  const extra = resolve.extra(conf, transaction)
  if (extra.cache.txSources) return extra.cache.txSources

  const array = extra.cache.txSources = [ transaction.source ]
  for (let index in transaction.operations) {
    const source = transaction.operations[index].source
    if (source && !array.find(a => a === source)) array.push(source)
  }

  return array
}

/**
 * Returns an object such as:
 *
 * ```js
 * {
 *    $accountId: $accountSigners
 *    ...
 * }
 * ```
 *
 * @param {Transaction} transaction
 * @return {Object}
 */
resolve.txSigners = async function (conf, transaction) {
  const extra = resolve.extra(conf, transaction)
  if (extra.cache.txSigners) return extra.cache.txSigners

  const txSources = resolve.txSources(extra, transaction)
  const signers = extra.cache.txSigners = {}

  for (let index in txSources) {
    const source = txSources[index]
    const account = await resolve.account(extra, source)
    if (!signers[account.id]) {
      signers[account.id] = account.signers.filter(signer => {
        return signer.type !== 'preauthTx'
      })
    }
  }

  return signers
}

/**
 * Returns an Array containing the keys for all legit signers for `transaction`.
 *
 * @param {Transaction} transaction
 * @return {Array}
 */
resolve.txSignersList = async function (conf, transaction) {
  const extra = resolve.extra(conf, transaction)
  if (!extra.cache.txSignersList) {
    const txSigners = await resolve.txSigners(extra, transaction)
    extra.cache.txSignersList = signersTableToSignersList(txSigners)
  }
  return extra.cache.txSignersList
}

function signersTableToSignersList (signersTable) {
  const array = []
  for (let accountId in signersTable) {
    signersTable[accountId].forEach(signer => {
      if (!array.find(key => key === signer.key)) array.push(signer.key)
    })
  }
  return array
}

/**
 * Add an extra field to `object` that embed cache and local configuration.
 *
 * @private
 */
resolve.extra = function (conf, object) {
  if (!object._cosmicplus) {
    helpers.setHiddenProperty(object, '_cosmicplus', {})
    if (conf.cache) object._cosmicplus.cache = conf.cache
    else object._cosmicplus.cache = { destination: {}, account: {} }
    object._cosmicplus.network = conf.network
    object._cosmicplus.current = conf.current
  }
  return object._cosmicplus
}
