"use strict"
/**
 * Contains the methods to convert data from *{@see Transaction}* format to
 * *Tdesc* format.
 *
 * @private
 * @exports destruct
 */
const destruct = exports

const misc = require("@cosmic-plus/jsutils/es5/misc")

const normalize = require("./normalize")
const specs = require("./specs")

/**
 * Convert `tx` into *Tdesc*.
 *
 * @param {Transaction} tx
 * @param {Object} options
 * @return {Object} A tdesc
 */
destruct.transaction = function (conf, tx, options = {}) {
  const tdesc = {}

  tdesc.network = options.network
  tdesc.horizon = options.horizon
  tdesc.callback = options.callback
  if (options.strip !== "source") {
    tdesc.source = tx.source
    if (options.strip !== "sequence") {
      tdesc.sequence = destruct.sequence(conf, tx.sequence)
    }
  }

  if (tx._memo._switch.name !== "memoNone")
    tdesc.memo = destruct.memo(conf, tx._memo)
  if (tx.timeBounds) {
    if (tx.timeBounds.minTime)
      tdesc.minTime = destruct.date(conf, tx.timeBounds.minTime)
    if (tx.timeBounds.maxTime)
      tdesc.maxTime = destruct.date(conf, tx.timeBounds.maxTime)
  }
  tdesc.fee = tx.fee

  tdesc.operations = tx.operations.map(op => destruct.operation(conf, op))

  normalize.tdesc(conf, tdesc)
  return tdesc
}

/**
 * Convert `op` into odesc format.
 *
 * @param {Object} op A StellarSdk Operation
 * @return {Object} An odesc
 */
destruct.operation = function (conf, op) {
  const odesc = {}

  for (let field in op) {
    if (field === "type") odesc.type = op.type
    else if (field === "line") odesc.asset = op.line
    else odesc[field] = destruct.field(conf, field, op[field])
  }

  normalize.odesc(conf, odesc)
  return odesc
}

/******************************************************************************/

/**
 * Destruct `value` according to `field` type.
 *
 * @param {string} field
 * @param {any} value
 */
destruct.field = function (conf, field, value) {
  const type = specs.fieldType[field]
  if (type) return destruct.type(conf, type, value)
  else throw new Error(`Invalid field: ${field}`)
}

/**
 * Destruct `value` using the destructuring function for `type`.
 *
 * @param {string} type
 * @param {any} value
 */
destruct.type = function (conf, type, value) {
  if (value === null || value === undefined) return value
  else return destruct[type](conf, value)
}

/******************************************************************************/

destruct.asset = function (conf, asset) {
  return Object.assign({}, asset)
}

destruct.assetPath = function (conf, assetPath) {
  return assetPath.map(asset => destruct.asset(asset))
}

destruct.amount = function (conf, amount) {
  return amount.replace(/\.?0+$/, "")
}

destruct.buffer = function (conf, buffer) {
  if (!buffer) return null
  const string = buffer.toString()
  if (misc.isUtf8(string)) {
    return { type: "text", value: string }
  } else {
    const value = buffer.toString("base64").replace(/=*$/, "")
    return { type: "base64", value: value }
  }
}

destruct.date = function (conf, timestamp) {
  return new Date(timestamp * 1000).toISOString()
}

destruct.memo = function (conf, sdkMemo) {
  const memo = {}
  if (sdkMemo._switch.name !== "memoNone") {
    memo.type = sdkMemo._arm
    if (memo.type === "hash" || memo.type === "retHash") {
      memo.value = sdkMemo._value.toString("hex")
      if (memo.type === "retHash") memo.type = "return"
    } else if (memo.type === "text") {
      return destruct.buffer(conf, sdkMemo._value)
    } else {
      memo.value = sdkMemo._value.toString()
    }
  }
  return memo
}

destruct.sequence = function (conf, sdkSequence) {
  return sdkSequence.toString()
}

destruct.signer = function (conf, sdkSigner) {
  const signer = { weight: sdkSigner.weight }
  if (sdkSigner.ed25519PublicKey) {
    signer.type = "key"
    signer.value = sdkSigner.ed25519PublicKey
  } else if (sdkSigner.sha256Hash) {
    signer.type = "hash"
    signer.value = sdkSigner.sha256Hash.toString("hex")
  } else if (sdkSigner.preAuthTx) {
    signer.type = "tx"
    signer.value = sdkSigner.preAuthTx.toString("hex")
  }
  return signer
}

/******************************************************************************/

/**
 * Provide dummy aliases for every other type for convenience & backward
 * compatibility.
 */
specs.types.forEach(type => {
  if (!exports[type]) exports[type] = (conf, value) => value
})
