"use strict"
/**
 * Sep-0007 support
 * https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0007.md
 *
 * @private
 */
const parseSep7 = exports

const convert = require("./convert")
const decode = require("./decode")
const parse = require("./parse")

/**
 * Initialize cosmicLink using `sep7Request`.
 */
parseSep7.request = function (cosmicLink, sep7Request, options) {
  parse.page(cosmicLink, sep7Request)

  const query = convert.uriToQuery(cosmicLink, sep7Request)
  const sep7 = decodeURIComponent(query.substr(5))
  return parseSep7.link(cosmicLink, sep7, options)
}

/**
 * Initialize cosmicLink using `sep7`.
 */
parseSep7.link = function (cosmicLink, sep7, options = {}) {
  if (sep7.substr(12, 4) === "pay?") {
    throw new Error("SEP-0007 'pay' operation is not currently supported.")
  } else if (sep7.substr(12, 3) !== "tx?") {
    throw new Error("Invalid SEP-0007 link.")
  }

  const query = convert.uriToQuery(cosmicLink, sep7)
  const params = query.substr(1).split("&")
  if (!options.network) options.network = "public"
  let xdr

  params.forEach(entry => {
    const field = entry.replace(/=.*$/, "")
    const value = entry.substr(field.length + 1)

    switch (field) {
    case "xdr":
      xdr = decodeURIComponent(value)
      break
    case "network_passphrase":
      options.network = decode.network(cosmicLink, value)
      break
    case "callback":
      if (value.substr(0, 4) !== "url:")
        throw new Error("Invalid callback: " + value)
      options.callback = decode.url(cosmicLink, value.substr(4))
      break
    default:
      if (isIgnoredSep7Field(field)) {
        // eslint-disable-next-line no-console
        console.log("Ignored SEP-0007 field: " + field)
      } else {
        throw new Error("Invalid SEP-0007 field: " + field)
      }
    }
  })

  if (!xdr) throw new Error("Missing XDR parameter")
  return { type: "xdr", value: xdr, options }
}

function isIgnoredSep7Field (field) {
  return specs.sep7IgnoredFields.find(name => name === field)
}

/******************************************************************************/
const specs = {}

/**
 * The mandatory fields for each SEP-0007 operation.
 */
specs.sep7MandatoryFields = {
  tx: ["xdr"],
  pay: ["destination"]
}

/**
 * The optional fields for each SEP-0007 operation.
 */
specs.sep7OptionalFields = {
  tx: [
    "pubkey",

    "callback",
    "msg",
    "network_passphrase",
    "origin_domain",
    "signature"
  ],
  pay: [
    "amount",
    "asset_code",
    "asset_issuer",
    "memo",
    "memo_type",

    "callback",
    "msg",
    "network_passphrase",
    "origin_domain",
    "signature"
  ]
}

specs.sep7IgnoredFields = ["msg", "origin_domain", "pubkey", "signature"]
