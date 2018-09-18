'use strict'
/**
 * Contains the methods to convert field values from CosmicLink's
 * `transaction descriptor` format to Stellar transaction object format.
 *
 * @private
 * @exports prepare
 */
const prepare = exports

const resolve = require('./resolve')
const specs = require('./specs')
const status = require('./status')

/**
 * Prepare `value` accordingly to `field` type.
 *
 * @param {string} field
 * @param {any} value
 */
prepare.field = async function (conf, field, value) {
  const type = specs.fieldType[field]
  if (type) return await prepare.type(conf, type, value)
  else status.error(conf, 'Unknow field: ' + field, 'throw')
}

/**
 * Prepare `value` using the preparing function for `type`.
 *
 * @param {string} type
 * @param {any} value
 */
prepare.type = async function (conf, type, value) {
  const preparer = exports[type]
  if (preparer) return await preparer(conf, value)
  else return value
}

/******************************************************************************/

prepare.address = async function (conf, address) {
  const account = await resolve.address(conf, address)
  return account.account_id
}

prepare.asset = async function (conf, asset) {
  if (asset.issuer) {
    const publicKey = await prepare.address(conf, asset.issuer)
    return new StellarSdk.Asset(asset.code, publicKey)
  } else {
    return StellarSdk.Asset.native()
  }
}

prepare.assetsArray = async function (conf, assetsArray) {
  let path = []
  for (let index in assetsArray) {
    const string = assetsArray[index]
    const preparedAsset = await prepare.asset(conf, string)
    path.push(preparedAsset)
  }
  return path
}

prepare.memo = function (conf, memo) {
  return new StellarSdk.Memo(memo.type, memo.value)
}

prepare.signer = async function (conf, signer) {
  let preparedSigner = { weight: signer.weight }
  switch (signer.type) {
    case 'key':
      const publicKey = await prepare.address(conf, signer.value)
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

prepare.source = prepare.address
