'use strict'
/**
 * Contains the methods to convert field values from CosmicLink's
 * `transaction descriptor` format to Stellar transaction object format.
 *
 * @exports prepare
 */
const prepare = exports

const specs = require('./specs')
const resolve = require('./resolve')
const status = require('./status')


/**
 * Prepare `value` accordingly to `field` type.
 *
 * @param {cosmicLink} cosmicLink
 * @param {string} field
 * @param {any} value
 */
prepare.field = async function (cosmicLink, field, value) {
  const type = specs.fieldType[field]
  if (type) return await prepare.type(cosmicLink, type, value)
  else status.error(cosmicLink, 'Unknow field: ' + field, 'throw')
}

/**
 * Prepare `value` using the preparing function for `type`.
 *
 * @param {cosmicLink} cosmicLink
 * @param {string} type
 * @param {any} value
 */
prepare.type = async function (cosmicLink, type, value) {
  const preparer = exports[type]
  if (preparer) return await preparer(cosmicLink, value)
  else return value
}

/******************************************************************************/

prepare.address = async function (cosmicLink, address) {
  const account = await resolve.address(cosmicLink, address)
  return account.account_id
}

prepare.asset = async function (cosmicLink, asset) {
  if (asset.issuer) {
    const publicKey = await prepare.address(cosmicLink, asset.issuer)
    return new StellarSdk.Asset(asset.code, publicKey)
  } else {
    return StellarSdk.Asset.native()
  }
}

prepare.assetsArray = async function (cosmicLink, assetsArray) {
  let path = []
  for (let index in assetsArray) {
    const string = assetsArray[index]
    const preparedAsset = await prepare.asset(cosmicLink, string)
    path.push(preparedAsset)
  }
  return path
}

prepare.memo = function (cosmicLink, memo) {
  return new StellarSdk.Memo(memo.type, memo.value)
}

prepare.signer = async function (cosmicLink, signer) {
  let preparedSigner = { weight: signer.weight }
  switch (signer.type) {
    case 'key':
      const publicKey = await prepare.address(cosmicLink, signer.value)
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
