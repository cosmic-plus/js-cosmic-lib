'use strict'

import {shorter, timeout, delay} from './helpers'
import * as status from './status'

/**
 * Contains functions that probe the blockchain or federation servers to collect
 * datas.
 *
 * @module
 */

/**
 * Select the network to be used by `StellarSdk` as being `cosmicLink` current
 * network.
 *
 * @param {CL}
 */
export function selectNetwork (cosmicLink) {
  switch (cosmicLink.network) {
    case 'test':
      StellarSdk.Network.useTestNetwork()
      break
    case 'public':
      StellarSdk.Network.usePublicNetwork()
      break
    default: throw new Error('Invalid network: ' + cosmicLink.network)
  }
}

/**
 * Configure for how much time the resolved addresses are kept in cache,
 * in seconds. The default is set to 5 minutes to avoid resolving to an outdated
 * address.
 *
 * @const
 */
export let accountCacheExpiration = 5 * 60

/**
 * Contains promise of previously fetched accounts.
 *
 * @private
 * @type {Object}
 */
const _accountCache = {}

/**
 * Cache `promise` resolving to `address`'s account for `accountCacheExpiration`
 * seconds.
 *
 * @private
 * @param {string} address
 * @param {Promise} promise
 */
async function _cacheAccount (address, promise) {
  _accountCache[address] = promise
  await timeout(accountCacheExpiration * 1000)
  delete _accountCache[address]
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
function resolveAddress (cosmicLink, address) {
  if (_accountCache[address]) return _accountCache[address]
  const promise = _addressResolver(cosmicLink, address)
  _cacheAccount(address, promise)
  return promise
}
exports.address = resolveAddress

/**
 * Helper for the previous resolve.address function.
 * Resolve to an account object for `address` or write error/status in
 * `cosmicLink`.
 *
 * @private
 * @param {cosmicLink} cosmicLink
 * @param {string} address
 */
async function _addressResolver (cosmicLink, address) {
  if (address.length !== 56 && !address.match(/.*\*.*\..*/)) {
    status.fail(cosmicLink, 'Invalid address(es)')
    status.error(cosmicLink, 'Invalid address: ' + shorter(address), 'throw')
  }

  try {
    const account = await StellarSdk.FederationServer.resolve(address)
    if (!account.account_id) throw new Error('Empty account')
    return account
  } catch (error) {
    console.log(error)
    status.fail(cosmicLink, 'Unresolved address(es)')
    status.error(cosmicLink, "Can't resolve: " + shorter(address), 'throw')
  }
}

export async function getSourceAccount (cosmicLink) {
  cosmicLink.selectNetwork()
  const source = await cosmicLink.getSource()
  const account = await resolveAddress(cosmicLink, source)
  const publicKey = account.account_id
  try {
    const accountResponse = await cosmicLink.server.loadAccount(publicKey)
    return accountResponse
  } catch (error) {
    console.log(error)
    status.error(cosmicLink, `Can't find source account on ${cosmicLink.network} network`)
    status.fail(cosmicLink, 'Empty source account', 'throw')
  }
}

/**
 * Return an array containing the legit signers for `cosmicLink`.
 *
 * @param {CL}
 * @return {Array} Signers
 */
export async function getSigners (cosmicLink) {
  const account = await cosmicLink.getSourceAccount()
  const signers = []
  for (let index in account.signers) {
    const entry = account.signers[index]
    const StrKey = StellarSdk.StrKey
    const signer = { weight: entry.weight, value: entry.key }
    signer.type = entry.type.replace(/^.*_/,'')
    if (signer.type === 'hash') signer.value = StrKey.decodeSha256Hash(entry.key).toString('hex')
    if (signer.type === 'tx') {
      signer.value = StrKey.decodePreAuthTx(entry.key).toString('hex')
    }
    signer.getSignature = getSignature(cosmicLink, signer)
    signers.push(signer)
  }
  return signers.sort((a, b) => b.weight - a.weight)
}

function getSignature (cosmicLink, signer) {
  return delay(async () => {
    switch (signer.type) {
      case 'tx':
        try {
          await resolveTransaction(cosmicLink, signer.value)
          return true
        } catch (error) {
          return false
        }
      case 'hash': return false
      case 'key':
        const tdesc = await cosmicLink.getTdesc()
        if(!tdesc.signatures) return false

        const keypair = StellarSdk.Keypair.fromPublicKey(signer.value)
        const hint = keypair.signatureHint().toString('base64')
        return tdesc.signatures.find(entry => {
          if (entry.hint === hint) return entry.signature
        })
    }
  })
}

export async function hasSigned (cosmicLink, type, value) {
  const signers = await cosmicLink.getSigners()
  for (let index in signers) {
    const signer = signers[index]
    if (
      signer.type === type
      && signer.value === value
      && await signer.getSignature()
    ) {
      return true
    }
  }
  return false
}

async function resolveTransaction(cosmicLink, transactionId) {
  const caller = cosmicLink.server.transactions()
  return caller.transaction(transactionId).call()
}

//~ async function getThreshold (cosmicLink) {
  //~ const signers = await cosmicLink.getSigners()
  //~ const max = signers.reduce((accum, entry) => accum + entry.weight)
  //~ const current = signers.reduce((accum, entry) => accum + entry.signature ? entry.weight : 0)
  //~ return { current: current, max: max, required: 0 }
//~ }
