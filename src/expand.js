"use_strict"
/**
 * Methods that expand tdesc paramaters from their query/StellarSdk format into
 * their tdesc equivalent. This allows user to pass value in the format they
 * feel the most confortable with when creating CosmicLinks.
 *
 * @private
 * @exports expand
 */
const expand = exports

const Buffer = require("@cosmic-plus/base/buffer")
const StellarSdk = require("@cosmic-plus/base/stellar-sdk")

const decode = require("./decode")
const destruct = require("./destruct")
const normalize = require("./normalize")
const specs = require("./specs")

/**
 * Replace each tdesc field value that is in query/StellarSdk format by its
 * tdesc format counterpart. This function alter the `tdesc` passed in
 * parameter.
 *
 * @param {Object} tdesc
 * @return tdesc
 */
expand.tdesc = function (conf, tdesc) {
  for (let field in tdesc) {
    if (field === "operations") continue
    else tdesc[field] = expand.field(conf, field, tdesc[field])
  }
  if (tdesc.operations)
    tdesc.operations.forEach(odesc => expand.odesc(conf, odesc))
  normalize.tdesc(conf, tdesc)
  return tdesc
}

/**
 * Replace each odesc field value that is in query/StellarSdk format by its
 * tdesc format counterpart. This function alter the `odesc` passed in
 * parameter.
 *
 * @param {Object} odesc
 * @return tdesc
 */
expand.odesc = function (conf, odesc) {
  for (let field in odesc) {
    if (field === "type") continue
    else odesc[field] = expand.field(conf, field, odesc[field])
  }
  normalize.odesc(conf, odesc)
  return odesc
}

/******************************************************************************/

/**
 * Expands `value` to its tdesc format according to `field` type.
 *
 * @param {string} field
 * @param {string} value
 */
expand.field = function (conf, field, value) {
  const type = specs.fieldType[field]
  if (type) return expand.type(conf, type, value)
  else throw new Error(`Invalid field: ${field}`)
}

/**
 * Expands `value` to its tdesc format according to `type`.
 *
 * @param {string} type
 * @param {string} value
 */
expand.type = function (conf, type, value) {
  if (value === null || value === undefined) return value
  if (typeof value === "number") value = value + ""
  return expand[type] ? expand[type](conf, value) : value + ""
}

/******************************************************************************/

expand.asset = function (conf, asset) {
  if (asset instanceof StellarSdk.Asset) return destruct.asset(conf, asset)
  else if (typeof asset === "string") return decode.asset(conf, asset)
  else return asset
}

expand.assetPath = function (conf, assetPath) {
  if (Array.isArray(assetPath))
    return assetPath.map(asset => expand.asset(conf, asset))
  else if (typeof assetPath === "string")
    return decode.assetPath(conf, assetPath)
}

expand.buffer = function (conf, buffer) {
  if (!buffer) return ""
  if (buffer instanceof Buffer) return destruct.buffer(conf, buffer)
  else if (typeof buffer === "string") return decode.buffer(conf, buffer)
  else return buffer
}

expand.date = function (conf, date) {
  if (typeof date === "number") date = date + ""
  if (!date.match(/^[0-9]*$/) || date.length < 5) return decode.date(conf, date)
  else return destruct.date(conf, date)
}

expand.memo = function (conf, memo) {
  if (memo instanceof StellarSdk.Memo) return destruct.memo(conf, memo)
  else if (typeof memo === "string") return decode.memo(conf, memo)
  else return memo
}

expand.price = function (conf, price) {
  if (typeof price === "string" && price.match(/:/)) {
    return decode.price(conf, price)
  } else {
    return price
  }
}

expand.signer = function (conf, signer) {
  if (signer.key) return destruct.signer(conf, signer)
  else if (typeof signer === "string") return decode.signer(conf, signer)
  else return signer
}

expand.string = function (conf, string) {
  if (typeof string === "number") return string + ""
  else return string
}

/******************************************************************************/

/**
 * Provide dummy aliases for every other type for convenience & backward
 * compatibility.
 */
specs.types.forEach(type => {
  if (!exports[type]) {
    exports[type] = (conf, value) => {
      if (typeof value === "number") return value + ""
      else return value
    }
  }
})
