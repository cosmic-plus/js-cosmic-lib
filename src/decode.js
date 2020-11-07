"use strict"
/**
 * Decode fields values from URI to cosmic link JSON format. This format differs
 * from Stellar transaction format: it is simpler, allow for federated address
 * and can be stringified/parsed without loss of information.
 *
 * For each of those functions, any error is recorded in the `conf` object
 * and HTML nodes are updated accordingly.
 *
 * @private
 * @exports decode
 */
const decode = exports

const check = require("./check")
const normalize = require("./normalize")
const specs = require("./specs")
const status = require("./status")

decode.query = function (conf, query = "?") {
  if (query.substr(0, 1) !== "?") status.fail(conf, "Invalid query", "throw")
  query = query.substr(1)

  const operations = []
  const tdesc = {}

  // Backward compatibility with the old non-standard syntax, deprecated since
  // 2019-08-26. This adds `type=` at the beginning of the query when the first
  // parameter doesn't contains an `=` sign.
  if (query.match(/^\w+(&|$)/)) query = `type=${query}`

  let parser
  const params = query.split("&")

  for (let index in params) {
    const entry = params[index]
    const field = entry.split("=", 1)[0]
    const value = entry.substring(field.length + 1)
    if (!field) continue

    if (field === "type") {
      if (parser) {
        status.error(conf, "Query declares 'type' several times", "throw")
      } else if (value !== "transaction") {
        operations[0] = { type: value }
      }
      parser = value
      continue
    } else if (!parser) {
      status.error(
        conf,
        `Query doesn't declare 'type' in first position`,
        "throw"
      )
    }

    if (field === "operation") {
      operations.push({ type: value })
      parser = "operation"
      continue
    }

    const decoded = decode.field(conf, field, value)

    /// Multi-operation link.
    if (parser === "transaction") {
      tdesc[field] = decoded
    } else if (parser === "operation") {
      operations[operations.length - 1][field] = decoded
      /// One-operation link.
    } else {
      if (specs.isTransactionField(field)) {
        tdesc[field] = decoded
      } else {
        operations[0][field] = decoded
      }
    }
  }

  tdesc.operations = operations
  normalize.tdesc(conf, tdesc)
  tdesc.operations.forEach((odesc) => normalize.odesc(conf, odesc))
  check.tdesc(conf, tdesc)
  return tdesc
}

/******************************************************************************/

/**
 * Decode `value` accordingly to `field` type.
 *
 * @param {string} field
 * @param {string} value
 */
decode.field = function (conf, field, value) {
  const type = specs.fieldType[field]
  return type ? decode.type(conf, type, value) : value
}

/**
 * Decode `value` using the decoding function for `type`.
 *
 * @param {string} type
 * @param {string} value
 */
decode.type = function (conf, type, value) {
  if (value) {
    value = decodeURIComponent(value)
    return process[type] ? process[type](conf, value) : value
  } else {
    return ""
  }
}

/******************************************************************************/

const process = {}

process.asset = function (conf, asset) {
  const assetLower = asset.toLowerCase()
  if (assetLower === "xlm" || assetLower === "native") {
    return { code: "XLM" }
  } else {
    const temp = asset.split(":")
    const object = { code: temp[0], issuer: temp[1] }
    return object
  }
}

process.assetsArray = function (conf, assetsList) {
  const strArray = assetsList.split(",")
  return strArray.map((entry) => decode.asset(conf, entry))
}

process.authorizeFlag = function (conf, flag) {
  // Backward compatibility (protocol =< 12)
  switch (flag) {
  case "false":
    return 0
  case "true":
    return 1
  }
  return Number(flag)
}

process.boolean = function (conf, string) {
  switch (string) {
  case "true":
    return true
  case "false":
    return false
  }
}

process.buffer = function (conf, string) {
  const matched = string.match(/(^[^:]*):/)
  const type = matched && matched[1]
  switch (type) {
  case "base64":
    return { type: type, value: string.substr(type.length + 1) }
  case "text":
    string = string.substr(type.length + 1)
    // Fallthrough
  default:
    return { type: "text", value: process.string(conf, string) }
  }
}

process.date = function (conf, string) {
  /// now + {minutes} syntactic sugar
  if (string.match(/^\+[0-9]+$/)) return string
  /// Use UTC timezone by default.
  if (string.match(/T[^+]*[0-9]$/)) string += "Z"
  return new Date(string).toISOString()
}

process.memo = function (conf, string) {
  const matched = string.match(/(^[^:]*):/)
  const type = matched && matched[1]
  switch (type) {
  case "base64":
  case "id":
  case "hash":
  case "return":
    return { type: type, value: string.substr(type.length + 1) }
  case "text":
    string = string.substr(type.length + 1)
    // Fallthrough
  default:
    return { type: "text", value: process.string(conf, string) }
  }
}

process.price = function (conf, price) {
  const numerator = price.replace(/:.*/, "")
  const denominator = price.replace(/^[^:]*:/, "")
  if (numerator === denominator) return price
  else return { n: +numerator, d: +denominator }
}

process.signer = function (conf, signer) {
  const temp = signer.split(":")
  const object = { weight: temp[0], type: temp[1], value: temp[2] }
  return object
}

process.string = function (conf, string) {
  return string.replace(/\+/g, " ")
}

process.network = process.string

/******************************************************************************/

/**
 * Provide dummy aliases for every other type for convenience & backward
 * compatibility.
 */
specs.types.forEach((type) => {
  exports[type] = (conf, value) => decode.type(conf, type, value)
})
