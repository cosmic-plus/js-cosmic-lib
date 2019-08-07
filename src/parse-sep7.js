"use strict"
/**
 * Sep-0007 support
 * https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0007.md
 *
 * @private
 */
const parseSep7 = exports

const Buffer = require("@cosmic-plus/base/es5/buffer")

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
  if (!options.network) options.network = "public"
  if (sep7.substr(12, 4) === "pay?") {
    return parseSep7.link.pay(cosmicLink, sep7, options)
  } else if (sep7.substr(12, 3) === "tx?") {
    return parseSep7.link.xdr(cosmicLink, sep7, options)
  } else {
    throw new Error("Invalid SEP-0007 link.")
  }
}

/**
 * Initialize cosmicLink using `sep7.xdr`.
 */
parseSep7.link.xdr = function (cosmicLink, sep7, options = {}) {
  const query = convert.uriToQuery(cosmicLink, sep7)
  const params = query.substr(1).split("&")
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
        throw new Error("Invalid SEP-0007 xdr field: " + field)
      }
    }
  })

  if (!xdr) throw new Error("Missing XDR parameter")
  return { type: "xdr", value: xdr, options }
}

/**
 * Initialize cosmicLink using `sep7.pay`.
 */
parseSep7.link.pay = function (cosmicLink, sep7, options = {}) {
  const query = convert.uriToQuery(cosmicLink, sep7)
  const params = query.substr(1).split("&")

  const odesc = { type: "payment" },
    asset = [],
    memo = []
  const tdesc = {
    network: options.network,
    operations: [odesc]
  }

  // Parse
  params.forEach(entry => {
    const field = entry.replace(/=.*$/, "")
    const value = entry.substr(field.length + 1)

    switch (field) {
    case "destination":
    case "amount":
      odesc[field] = decode.field(cosmicLink, field, value)
      break
    case "asset_code":
      asset[0] = value
      break
    case "asset_issuer":
      asset[1] = value
      break
    case "memo_type":
      memo[0] = value.split("_")[1].toLowerCase()
      break
    case "memo":
      memo[1] = value
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
        throw new Error("Invalid SEP-0007 pay field: " + field)
      }
    }
  })

  // Convert
  if (memo.length) {
    if (memo[0] === "hash" || memo[0] === "return") {
      const buffer = Buffer.from(decodeURIComponent(memo[1]), "base64")
      memo[1] = buffer.toString("hex")
    }
    tdesc.memo = decode.memo(cosmicLink, `${memo[0]}:${memo[1]}`)
  }
  if (asset.length) {
    odesc.asset = decode.asset(cosmicLink, `${asset[0]}:${asset[1]}`)
  }

  if (!odesc.destination) throw new Error("Missing parameter: destination")
  return { type: "tdesc", value: tdesc, options }
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
