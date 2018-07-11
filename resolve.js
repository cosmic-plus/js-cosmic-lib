'use strict'
/**
 * Contains functions that probe the blockchain or federation servers to collect
 * datas.
 *
 * @exports resolve
 */
const resolve = exports

const helpers = require('./helpers')
const status = require('./status')

/**
 * Select the network to be used by `StellarSdk` as being `cosmicLink` current
 * network.
 *
 * @param {CL}
 */
resolve.network = function (cosmicLink, network) {
  switch (network) {
    case 'test':
      StellarSdk.Network.useTestNetwork()
      return testServer
    case 'public':
      StellarSdk.Network.usePublicNetwork()
      return publicServer
    default: throw new Error('Invalid network: ' + network)
  }
}

const testServer = new StellarSdk.Server('https://horizon-testnet.stellar.org')
const publicServer = new StellarSdk.Server('https://horizon.stellar.org')

/**
 * Configure for how much time the resolved addresses are kept in cache,
 * in seconds. The default is set to 5 minutes to avoid resolving to an outdated
 * address.
 *
 * @const
 */
resolve.accountCacheExpiration = 5 * 60

/**
 * Contains promise of previously fetched accounts.
 *
 * @private
 * @type {Object}
 */
const accountCache = {}

/**
 * Cache `promise` resolving to `address`'s account for `accountCacheExpiration`
 * seconds.
 *
 * @private
 * @param {string} address
 * @param {Promise} promise
 */
async function cacheAccount (address, promise) {
  accountCache[address] = promise
  await helpers.timeout(resolve.accountCacheExpiration * 1000)
  delete accountCache[address]
}

/**
 * Return a promise that resolve to `address` account object, as defined in
 * JavaScript Stellar SDK API reference. `address` can be either a Stellar public
 * key or a federated address (account*example.org).
 * Returned results are cached and re-usable.
 *
 * In case of error, change `cosmicLink` status accordingly.
 *
 * @param {cosmicLink} cosmicLink
 * @param {string} address
 * @return {Promise} Resolve to `address` account object
 */
resolve.address = function (cosmicLink, address) {
  if (accountCache[address]) return accountCache[address]
  const promise = addressResolver(cosmicLink, address)
  cacheAccount(address, promise)
  return promise
}

/**
 * Helper for the previous resolve.address function.
 * Resolve to an account object for `address` or write error/status in
 * `cosmicLink`.
 *
 * @private
 * @param {cosmicLink} cosmicLink
 * @param {string} address
 */
async function addressResolver (cosmicLink, address) {
  if (address.length !== 56 && !address.match(/.*\*.*\..*/)) {
    status.fail(cosmicLink, 'Invalid address(es)')
    status.error(cosmicLink, 'Invalid address: ' + helpers.shorter(address), 'throw')
  }

  try {
    const account = await StellarSdk.FederationServer.resolve(address)
    const publicKey = account.account_id
    if (!publicKey) throw new Error('Empty account')
    if (!account.memo_type && account.memo !== undefined) delete account.memo
    if (address !== publicKey) account.address = address
    const alias = cosmicLink.aliases[publicKey]
    if (alias) account.alias = alias
    return account
  } catch (error) {
    console.log(error)
    status.fail(cosmicLink, 'Unresolved address(es)')
    status.error(cosmicLink, "Can't resolve: " + helpers.shorter(address), 'throw')
  }
}

/**
 * Return the account object for `address` on `network`.
 *
 * @param {CL}
 * @param {string} address A public key or a federated address
 * @param {string} network Either 'test' or 'public'
 * @return {Object} The account response
 */
resolve.account = async function (cosmicLink, address, network) {
  const server = resolve.network(cosmicLink, network)
  const account = await resolve.address(cosmicLink, address)
  const publicKey = account.account_id
  try {
    return server.loadAccount(publicKey)
  } catch (error) {
    console.log(error)
    status.error(cosmicLink, `Can't find account`, 'throw')
  }
}

/**
 * Returns the source account object for `cosmicLink`
 *
 * @param {CL}
 * @return {Object} The account response
 */
resolve.getSourceAccount = async function (cosmicLink) {
  const source = await cosmicLink.getSource()
  try {
    return resolve.account(cosmicLink, source, cosmicLink.network)
  } catch (error) {
    status.error(cosmicLink, `Can't find source account on ${cosmicLink.network} network`)
    status.fail(cosmicLink, 'Empty source account', 'throw')
  }
}

/**
 * Return the signers for the account at `address` on `network`.
 *
 * @param {CL}
 * @param {string} address Either a public key or a federated address
 * @param {string} network Either 'test' or 'public'
 * @return {Object} The signers object from the account response
 */
resolve.accountSigners = async function (cosmicLink, address, network) {
  const account = await resolve.account(cosmicLink, address, network)
  return account.signers
}

/**
 * Return an array containing the legit signers for `cosmicLink` transaction.
 *
 * @param {CL}
 * @return {Array} Signers
 */
resolve.signers = async function (cosmicLink) {
  const tdesc = await cosmicLink.getTdesc()
  const sources = await transactionSources(cosmicLink, tdesc)

  const signers = []
  for (let index in sources) {
    const source = sources[index]
    const account = await resolve.account(cosmicLink, source, cosmicLink.network)

    for (let index in account.signers) {
      const entry = account.signers[index]
      const StrKey = StellarSdk.StrKey
      const signer = { weight: entry.weight, value: entry.key }
      signer.type = entry.type.replace(/^.*_/, '')
      if (signer.type === 'hash') signer.value = StrKey.decodeSha256Hash(entry.key).toString('hex')
      if (signer.type === 'tx') {
        signer.value = StrKey.decodePreAuthTx(entry.key).toString('hex')
      }
      signer.getSignature = getSignature(cosmicLink, signer)
      signers.push(signer)
    }
  }

  return signers.sort((a, b) => b.weight - a.weight)
}

async function transactionSources (cosmicLink, tdesc) {
  const sources = tdesc.operations.map(entry => entry.source)
  sources.push(tdesc.source || cosmicLink.user)

  let accounts = {}
  for (let index in sources) {
    const source = sources[index]
    if (!source) continue
    const account = await resolve.address(cosmicLink, source)
    accounts[account.account_id] = account
  }

  return Object.keys(accounts)
}

function getSignature (cosmicLink, signer) {
  return helpers.delay(async () => {
    switch (signer.type) {
      case 'tx':
        try {
          await resolve.transaction(cosmicLink, signer.value)
          return true
        } catch (error) {
          return false
        }
      case 'hash': return false
      case 'key':
        const tdesc = await cosmicLink.getTdesc()
        if (!tdesc.signatures) return false

        const keypair = StellarSdk.Keypair.fromPublicKey(signer.value)
        const hint = keypair.signatureHint().toString('base64')
        return tdesc.signatures.find(entry => {
          if (entry.hint === hint) return entry.signature
        })
    }
  })
}

resolve.hasSigned = async function (cosmicLink, type, value) {
  const signers = await cosmicLink.getSigners()
  for (let index in signers) {
    const signer = signers[index]
    if (
      signer.type === type &&
      signer.value === value &&
      await signer.getSignature()
    ) {
      return true
    }
  }
  return false
}

resolve.transaction = async function (cosmicLink, txHash) {
  const caller = cosmicLink.server.transactions()
  return caller.transaction(txHash).call()
}

// ~ async function getThreshold (cosmicLink) {
// ~ const signers = await cosmicLink.getSigners()
// ~ const max = signers.reduce((accum, entry) => accum + entry.weight)
// ~ const current = signers.reduce((accum, entry) => accum + entry.signature ? entry.weight : 0)
// ~ return { current: current, max: max, required: 0 }
// ~ }
