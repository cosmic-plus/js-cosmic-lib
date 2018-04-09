'use strict'

import * as specs from './specs'
import * as resolve from './resolve'
import * as status from './status'

/**
 * Contains the methods to convert field values from CosmicLink's
 * `transaction descriptor` format to Stellar transaction object format.
 *
 * @module
 */

/**
 * Prepare `value` accordingly to `field` type.
 *
 * @param {cosmicLink} cosmicLink
 * @param {string} field
 * @param {any} value
 */
export async function fieldValue (cosmicLink, field, value) {
  const type = specs.fieldType[field]
  if (type) return await typedValue(cosmicLink, type, value)
  else status.error(cosmicLink, 'Unknow field: ' + field, 'throw')
}

/**
 * Prepare `value` using the preparing function for `type`.
 *
 * @param {cosmicLink} cosmicLink
 * @param {string} type
 * @param {any} value
 */
export async function typedValue (cosmicLink, type, value) {
  const preparer = exports[type]
  if (preparer) return await preparer(cosmicLink, value)
  else return value
}

/******************************************************************************/

/**
 * Returns the `publicKey` for `address`.
 *
 * @param {CL}
 * @param {string} Address
 * @return {publicKey}
 */
export async function address (cosmicLink, address) {
  const account = await resolve.address(cosmicLink, address)
  return account.account_id
}

/**
 * Returns the Asset object equivalent to cosmic link `asset`.
 *
 * @param {CL}
 * @param {string} asset
 * @return {Asset}
 */
export async function asset (cosmicLink, asset) {
  if (asset.issuer) {
    const publicKey = await address(cosmicLink, asset.issuer)
    return new StellarSdk.Asset(asset.code, publicKey)
  } else {
    return StellarSdk.Asset.native()
  }
}

/**
 * Returns an array of Assets object equivalent to cosmic link `assetsArray`.
 *
 * @param {CL}
 * @param {Array.string} assetsArray
 * @return {Array.Asset}
 */
export async function assetsArray (cosmicLink, assetsArray) {
  let path = []
  for (let index in assetsArray) {
    const string = assetsArray[index]
    const preparedAsset = await asset(cosmicLink, string)
    path.push(preparedAsset)
  }
  return path
}

/**
 * Returns a Stellar Memo equivalent to cosmic link `memo`.
 *
 * @param {CL}
 * @param {Object} memo { type: t, value: v}
 * @return {Memo}
 */
export function memo (cosmicLink, memo) {
  return new StellarSdk.Memo(memo.type, memo.value)
}

/**
 * Return a Signer object equivalent to cosmic link `signer`,
 *
 * @param {CL}
 * @param {Object} signer { weigth: w, type: t, value: v }
 * @return {Signer}
 */
export async function signer (cosmicLink, signer) {
  let preparedSigner = { weight: signer.weight }
  switch (signer.type) {
    case 'key':
      const publicKey = await address(cosmicLink, signer.value)
      preparedSigner.ed25519PublicKey = publicKey
      break
    case 'hash':
      preparedSigner.sha256Hash = signer.value
      break
    case 'tx':
      preparedSigner.preAuthTx = signer.value
      break
  }
  return preparedSigner
}
