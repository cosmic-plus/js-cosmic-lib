'use strict'

import {shorter, timeout} from './helpers'
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
export function address (cosmicLink, address) {
  if (_accountCache[address]) return _accountCache[address]
  const promise = _resolveAddress(cosmicLink, address)
  _cacheAccount(address, promise)
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
async function _resolveAddress (cosmicLink, address) {
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
