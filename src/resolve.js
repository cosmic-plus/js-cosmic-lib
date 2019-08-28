"use strict"
/**
 * Contains functions that probe the blockchain or federation servers to collect
 * datas.
 *
 * @exports resolve
 */
const resolve = exports

const misc = require("@cosmic-plus/jsutils/es5/misc")
const StellarSdk = require("@cosmic-plus/base/es5/stellar-sdk")

const specs = require("./specs")
const status = require("./status")

/**
 * Returns the
 * [Server]{@link https://stellar.github.io/js-stellar-sdk/Server.html} object
 * for **horizon**, or for **network**, or for the current network.
 *
 * @param {string} [network] 'public', 'test' or a network passphrase
 * @param {string} [horizon] A horizon URL
 * @returns {Server} A StellarSdk Server object
 */
resolve.server = function (
  conf,
  network = conf.network,
  horizon = conf.horizon
) {
  if (!horizon) horizon = resolve.horizon(conf, network)
  if (!horizon) throw new Error("No horizon node defined for selected network.")
  if (!conf.current.server[horizon]) {
    conf.current.server[horizon] = new StellarSdk.Server(horizon)
  }
  return conf.current.server[horizon]
}

/**
 * Switch to the current network, or to **network** if provided.
 *
 * @deprecated StellarSdk global `Network` setting is deprecated.
 * @param {string} [network] 'public', 'test' or a network passphrase
 * @returns {Server} A StellarSdk Server object
 */
resolve.useNetwork = function (conf, network = conf.network) {
  // DEPRECATED - to be removed when in sync with stellar-sdk 3.x.
  console.warn(
    "`.selectNetwork()`, `.useNetwork()`, as well as StellarSdk global `Network` setting are deprecated. Please use `cosmicLib.config.network` or pass parameter explicitely."
  )

  const passphrase = resolve.networkPassphrase(conf, network)
  const currentPassphrase = resolve.networkPassphrase()
  if (passphrase !== currentPassphrase) {
    // eslint-disable-next-line no-console
    console.log("Switch to network: " + network)
    StellarSdk.Network.use(new StellarSdk.Network(passphrase))
  }
}

/**
 * Returns the curent Horizon node URL, or the Horizon node URL for **network**
 * if provided.
 *
 * @param {string} [network] A network name or passphrase.
 */
resolve.horizon = function (conf, network = conf.network) {
  if (conf.horizon) {
    return conf.horizon
  } else {
    const passphrase = resolve.networkPassphrase(conf, network)
    if (conf.current && conf.current.horizon[passphrase]) {
      return conf.current.horizon[passphrase]
    }
  }
}

/**
 * Returns the current network passphrase, or the passphrase for **network** is
 * provided.
 */
resolve.networkPassphrase = function (conf = {}, network = conf.network) {
  if (network === undefined) {
    // DEPRECATED: To be removed in sync with stellar-sdk 3.x.
    const currentNetwork = StellarSdk.Network.current()
    if (currentNetwork) return currentNetwork.networkPassphrase()
  } else {
    return conf.current.passphrase[network] || network
  }
}

/**
 * Returns the network name for **network passphrase**, or `undefined`.
 *
 * @param {string} networkPassphrase
 * @return {string}
 */
resolve.networkName = function (conf = {}, networkPassphrase) {
  const index = Object.values(conf.current.passphrase).indexOf(
    networkPassphrase
  )
  if (index === -1) return networkPassphrase
  else return Object.keys(conf.current.passphrase)[index]
}

/**
 * Returns the federation server
 * [Account]{@link https://stellar.github.io/js-stellar-sdk/Account.html}
 * for **address**.
 *
 * @async
 * @param {string} address A Stellar public key or a federated address
 * @return {} Resolve to federation server response
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
    if (!accountId) throw new Error("Unknow address")
    if (!account.memo_type) delete account.memo
    if (address !== accountId) account.address = address
    if (conf.aliases && conf.aliases[accountId]) {
      account.alias = conf.aliases[accountId]
    }
    return account
  } catch (error) {
    console.error(error)
    status.error(conf, "Can't resolve: " + misc.shorter(address))
    status.fail(conf, "Unresolved address", "throw")
  }
}

/**
 * Returns the
 * [AccountResponse]{@link https://stellar.github.io/js-stellar-sdk/AccountResponse.html}
 * object for **address**.
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
      if (error.response) {
        status.error(conf, "Empty account: " + misc.shorter(accountId), "throw")
      } else {
        status.error(
          conf,
          "Invalid horizon node: " + resolve.horizon(conf),
          "throw"
        )
      }
    }
  }
}

/**
 * Returns `true` if **address** account is empty, `false` otherwise.
 *
 * @async
 * @param {string} address Public key or federated address
 * @return {boolean}
 */
resolve.isAccountEmpty = function (conf, address) {
  return resolve
    .account(conf, address, true)
    .then(() => false)
    .catch(() => true)
}

/**
 * Returns the account object for transaction source **address`** with sequence
 * set at **sequence** if provided. If **address** is not provided, returns the
 * neutral account object instead (as in SEP-0007 specifications).
 *
 * @param {string} [address]
 * @param {string|numbre} [sequence]
 * @return {AccountResponse}
 */
resolve.txSourceAccount = async function (conf, address, sequence) {
  if (!address) {
    return makeAccountResponse(conf, specs.neutralAccountId, "-1")
  } else {
    const destination = await resolve.address(conf, address)
    if (destination.memo)
      status.error(
        conf,
        "Invalid transaction source address (requires a memo)",
        "throw"
      )
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
 * Creates an AccountResponse object with signers set for an empty account.
 *
 * @param  {string} publicKey
 * @param  {string} sequence [description]
 * @return {AccountResponse}
 */
function makeAccountResponse (conf, publicKey, sequence) {
  const account = new StellarSdk.Account(publicKey, sequence)
  if (conf.cache) conf.cache.account[publicKey] = account
  account.id = publicKey

  account.signers = [
    {
      public_key: publicKey,
      weight: 1,
      key: publicKey,
      type: "ed25519_public_key"
    }
  ]

  return account
}

/**
 * Returns the array of all source accounts ID involved in **transaction**.
 *
 * @param {Transaction} transaction
 * @return {Array}
 */
resolve.txSources = function (conf, transaction) {
  if (!transaction.source) throw new Error("No source for transaction")

  const extra = resolve.extra(conf, transaction)
  if (extra.cache.txSources) return extra.cache.txSources

  const array = extra.cache.txSources = [transaction.source]
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
    const account = await resolveTxSource(extra, source)
    if (!signers[account.id]) {
      signers[account.id] = account.signers.filter(signer => {
        return signer.type !== "preauthTx"
      })
    }
  }

  return signers
}

async function resolveTxSource (conf, address) {
  try {
    return await resolve.account(conf, address, "quiet")
  } catch (error) {
    return makeAccountResponse(conf, address, "0")
  }
}

/**
 * Returns an Array containing the keys for all legit signers of **transaction**.
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
 * Add an extra field to **object** that embed cache and local configuration.
 *
 * @private
 */
resolve.extra = function (conf, object) {
  if (!object._cosmicplus) {
    misc.setHiddenProperty(object, "_cosmicplus", {})
    if (conf.cache) object._cosmicplus.cache = conf.cache
    else object._cosmicplus.cache = { destination: {}, account: {} }
    object._cosmicplus.network = conf.network
    object._cosmicplus.current = conf.current
  }
  return object._cosmicplus
}
