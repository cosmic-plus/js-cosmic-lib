"use strict"
/**
 * Contains the methods to convert field values from CosmicLink's
 * `transaction descriptor` format to Stellar transaction object format.
 *
 * @private
 * @exports construct
 */
const construct = exports

const Buffer = require("@cosmic-plus/base/buffer")
const helpers = require("@cosmic-plus/jsutils/misc")
const StellarSdk = require("@cosmic-plus/base/stellar-sdk")

const resolve = require("./resolve")
const specs = require("./specs")
const status = require("./status")

/**
 * Returns the StellarSdk Transaction built from tdesc.
 *
 * @param {Object} tdesc
 * @return {Transaction}
 */
construct.transaction = async function (conf, tdesc) {
  if (conf.status) throw new Error(conf.status)

  try {
    const txBuilder = await makeTransactionBuilder(conf, tdesc)
    for (let index in tdesc.operations) {
      const odesc = tdesc.operations[index]
      const operation = await construct.operation(conf, odesc)
      txBuilder.addOperation(operation)
    }
    return txBuilder.build()
  } catch (error) {
    if (!conf.errors) {
      console.error(error)
      status.error(conf, error.message)
    }
    if (!conf.status) status.fail(conf, "Transaction build failed", "throw")
    else throw error
  }
}

/**
 * Returns the StellarSdk Operation built from `odesc`.
 *
 * @param {Object} odesc
 * @return {Operation}
 */
construct.operation = async function (conf, odesc) {
  const operation = odesc.type
  delete odesc.type

  for (let field in odesc) {
    odesc[field] = await construct.field(conf, field, odesc[field])
  }

  return StellarSdk.Operation[operation](odesc)
}

/**
 * Returns the TransactionBuilder for `tdesc`.
 */
async function makeTransactionBuilder (conf, tdesc) {
  const server = resolve.server(conf)
  const baseFee = await server.fetchBaseFee()

  let txOpts = {}
  if (tdesc.fee) txOpts.fee = tdesc.fee
  else txOpts.fee = tdesc.operations.length * baseFee
  if (tdesc.memo) txOpts.memo = construct.memo(conf, tdesc.memo)
  if (tdesc.minTime || tdesc.maxTime) {
    txOpts.timebounds = { minTime: 0, maxTime: 0 }
    if (tdesc.minTime)
      txOpts.timebounds.minTime = construct.date(conf, tdesc.minTime)
    if (tdesc.maxTime)
      txOpts.timebounds.maxTime = construct.date(conf, tdesc.maxTime)
  }

  const sourceAccount = await resolve.txSourceAccount(
    conf,
    tdesc.source,
    tdesc.sequence
  )
  const builder = new StellarSdk.TransactionBuilder(sourceAccount, txOpts)
  if (!tdesc.maxTime) builder.setTimeout(StellarSdk.TimeoutInfinite)

  /// Check if memo is needed for destination account.
  for (let index in tdesc.operations) {
    const operation = tdesc.operations[index]
    if (operation.destination) {
      const destination = await resolve.address(conf, operation.destination)
      if (destination.memo) {
        const memoType = destination.memo_type
        const memoValue = destination.memo
        if (
          tdesc.memo
          && (tdesc.memo.type !== memoType || tdesc.memo.value !== memoValue)
        ) {
          const short = helpers.shorter(operation.destination)
          status.error(
            conf,
            `Memo conflict: ${short} requires to set a memo`,
            "throw"
          )
        } else {
          tdesc.memo = { type: memoType, value: memoValue }
          builder.addMemo(new StellarSdk.Memo(memoType, memoValue))
        }
      }
    }
  }

  return builder
}

/******************************************************************************/

/**
 * Prepare `value` accordingly to `field` type.
 *
 * @param {string} field
 * @param {any} value
 */
construct.field = async function (conf, field, value) {
  const type = specs.fieldType[field]
  if (type) return construct.type(conf, type, value)
  else throw new Error(`Invalid field: ${field}`)
}

/**
 * Prepare `value` using the preparing function for `type`.
 *
 * @param {string} type
 * @param {any} value
 */
construct.type = async function (conf, type, value) {
  return construct[type](conf, value)
}

/******************************************************************************/

construct.address = async function (conf, address) {
  const account = await resolve.address(conf, address)
  return account.account_id
}

construct.asset = async function (conf, asset) {
  if (asset.issuer) {
    const publicKey = await construct.address(conf, asset.issuer)
    return new StellarSdk.Asset(asset.code, publicKey)
  } else {
    return StellarSdk.Asset.native()
  }
}

construct.assetsArray = async function (conf, assetsArray) {
  let path = []
  for (let index in assetsArray) {
    const string = assetsArray[index]
    const constructedAsset = await construct.asset(conf, string)
    path.push(constructedAsset)
  }
  return path
}

construct.buffer = function (conf, object) {
  if (object.type === "base64") {
    return Buffer.from(object.value, "base64")
  } else {
    return object.value || null
  }
}

construct.date = function (conf, string) {
  return Date.parse(string) / 1000
}

construct.memo = function (conf, memo) {
  if (memo.type === "base64") {
    return new StellarSdk.Memo("text", Buffer.from(memo.value, "base64"))
  } else {
    return new StellarSdk.Memo(memo.type, memo.value)
  }
}

construct.signer = async function (conf, signer) {
  let sdkSigner = { weight: +signer.weight }
  if (signer.type === "tx") sdkSigner.preAuthTx = signer.value
  else if (signer.type === "hash") sdkSigner.sha256Hash = signer.value
  else if (signer.type === "key") {
    const publicKey = await construct.address(conf, signer.value)
    sdkSigner.ed25519PublicKey = publicKey
  }
  return sdkSigner
}

/******************************************************************************/

/**
 * Provide dummy aliases for every other type for convenience & backward
 * compatibility.
 */
specs.types.forEach(type => {
  if (!exports[type]) exports[type] = (conf, value) => value
})
