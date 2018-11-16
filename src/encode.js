"use strict"
/**
 * Contains the methods to encode values formatted in `transaction descriptor`
 * format into URI format.
 *
 * @private
 * @exports encode
 */
const encode = exports

const decode = require("./decode")
const specs = require("./specs")

encode.query = function (conf, tdesc) {
  if (conf.errors) return undefined

  let command
  if (!tdesc.operations.length || tdesc.operations.length > 1 || tdesc.operations[0].source) {
    command = "transaction"
  } else {
    command = tdesc.operations[0].type
  }
  let query = "?" + command

  specs.transactionOptionalFields.forEach(field => {
    if (tdesc[field] !== undefined) query += encode.field(conf, field, tdesc[field])
  })

  tdesc.operations.forEach(odesc => {
    if (command === "transaction") query += "&operation=" + odesc.type
    for (let field in odesc) {
      if (field === "type") continue
      query += encode.field(conf, field, odesc[field])
    }
  })

  return query
}

/******************************************************************************/

/**
 * Encode `value` into cosmic link query format and return
 * `&${field}=${encodedValue}`
 *
 * @param {string} field
 * @param {*} value `value` should use cosmic link JSON format
 * @return {string}
 */
encode.field = function (conf, field, value) {
  const type = specs.fieldType[field]
  if (!type) throw new Error(`Invalid field: ${field}`)

  const encodedValue = encode.type(conf, type, value)
  if (encodedValue === "" && field !== "homeDomain") return ""
  else return `&${field}=${encodedValue}`
}

/**
 * Encode `value` into cosmic link query format according to `type`.
 *
 * @param {string} field
 * @param {*} value `value` should use cosmic link JSON format
 * @return {string}
 */
encode.type = function (conf, type, value) {
  if (value === undefined) return ""

  const encodedValue = process[type] ? process[type](conf, value) : value
  if (encodedValue === undefined) return ""
  else return encodedValue
}

/******************************************************************************/

const process = {}

process.asset = function (conf, asset) {
  if (asset.issuer) return encodeURIComponent(asset.code) + ":" + encodeURIComponent(asset.issuer)
}

process.assetsArray = function (conf, assetsArray) {
  return assetsArray.map(asset => encode.asset(conf, asset)).toString()
}

process.boolean = function (conf, boolean) {
  if (boolean === false) return "false"
}

process.buffer = function (conf, buffer) {
  if (buffer.type === "text") {
    // Guard against prefix mis-interpretation.
    const decoded = decode.buffer(conf, buffer.value)
    if (decoded.type === "text") return encodeURIComponent(buffer.value)
  } else if (buffer) {
    return buffer.type + ":" + encodeURIComponent(buffer.value)
  }
}

process.date = function (conf, date) {
  return date.replace(/Z$/, "")
}

process.memo = function (conf, memo) {
  if (memo.type === "text") {
    // Guard against prefix mis-interpretation.
    const decoded = decode.memo(conf, memo.value)
    if (decoded.type === "text") return encodeURIComponent(memo.value)
  }
  return memo.type + ":" + encodeURIComponent(memo.value)
}

process.price = function (conf, price) {
  if (typeof price === "string") return price
  else return price.n + ":" + price.d
}

process.signer = function (conf, signer) {
  return signer.weight + ":" + signer.type + ":" + signer.value
}

process.string = encode.buffer

process.url = function (conf, url) {
  if (url.substr(0, 8) === "https://") url = url.substr(8)
  return encodeURIComponent(url)
}

/******************************************************************************/

/**
 * Provide dummy aliases for every other type for convenience & backward
 * compatibility.
 */
specs.types.forEach(type => {
  exports[type] = (conf, value) => encode.type(conf, type, value)
})
