"use strict"
/**
 * Sep-0007 protocol utilities.
 *
 * The methods listed in the documentation are browser-only.
 *
 * @see https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0007.md
 *
 * @exports sep7Utils
 */
const sep7Utils = exports

const Buffer = require("@cosmic-plus/base/es5/buffer")
const env = require("@cosmic-plus/jsutils/es5/env")
const StellarSdk = require("@cosmic-plus/base/es5/stellar-sdk")
const { timeout } = require("@cosmic-plus/jsutils/es5/misc")

const check = require("./check")
const convert = require("./convert")
const decode = require("./decode")
const parse = require("./parse")

/* Utils */

/**
 * Proposes the user to register **handler** as her default SEP-0007 link
 * handler. SEP-0007 requests will hit `{handler}?sep7={sep7Request}`.
 *
 * Note that this makes use of a non-standard feature. Compatibility can be
 * checked using `sep7Utils.isWebHandlerSupported()`.
 *
 * [List of compatible browsers](https://caniuse.com/#feat=registerprotocolhandler).
 *
 * @example
 * cosmicLib.sep7Utils.registerWebHandler(
 *  "https://cosmic.link/",
 *  "Cosmic.link"
 * )
 *
 * @param handler {String} URL of the SEP-0007 web handler.
 * @param description {String} A brief description of the service.
 */
sep7Utils.registerWebHandler = function (handler, description) {
  if (!env.isBrowser) throw new Error("This is a browser-only function.")

  if (navigator.registerProtocolHandler) {
    navigator.registerProtocolHandler(
      "web+stellar",
      `${handler}?sep7=%s`,
      description
    )
  } else {
    throw new Error("This browser can't register a SEP-0007 web handler.")
  }
}

/**
 * Returns whether or not the browser can register a SEP-0007 web handler.
 *
 * @example
 * if (cosmicLib.sep7Utils.isWebHandlerSupported()) {
 *    registerSep7HandlerButton.show()
 * }
 *
 * @returns {Boolean}
 */
sep7Utils.isWebHandlerSupported = function () {
  return env.isBrowser && !!navigator.registerProtocolHandler
}

/* Parsing */

/**
 * Initialize cosmicLink using `sep7Request`.
 * @private
 */
sep7Utils.parseRequest = function (cosmicLink, sep7Request, options) {
  parse.page(cosmicLink, sep7Request)

  const query = convert.uriToQuery(cosmicLink, sep7Request)
  const sep7 = decodeURIComponent(query.replace(/^\?(req|sep7)=/, ""))
  return sep7Utils.parseLink(cosmicLink, sep7, options)
}

/**
 * Initialize cosmicLink using `sep7`.
 * @private
 */
sep7Utils.parseLink = function (cosmicLink, sep7, options = {}) {
  cosmicLink._sep7 = sep7
  if (!options.network) options.network = "public"
  if (sep7.substr(12, 4) === "pay?") {
    cosmicLink.extra.type = "pay"
    return sep7Utils.parsePayLink(cosmicLink, sep7, options)
  } else if (sep7.substr(12, 3) === "tx?") {
    cosmicLink.extra.type = "tx"
    return sep7Utils.parseTxLink(cosmicLink, sep7, options)
  } else {
    throw new Error("Invalid SEP-0007 link.")
  }
}

/**
 * Initialize cosmicLink using `sep7.xdr`.
 * @private
 */
sep7Utils.parseTxLink = function (cosmicLink, sep7, options = {}) {
  const query = convert.uriToQuery(cosmicLink, sep7)
  const params = query.substr(1).split("&")
  let xdr

  params.forEach((entry) => {
    const field = entry.replace(/=.*$/, "")
    const value = entry.substr(field.length + 1)

    switch (field) {
    case "xdr":
      xdr = decodeURIComponent(value)
      break
    case "pubkey":
      check.address(cosmicLink, value)
      cosmicLink.extra.pubkey = value
      break
    default:
      sep7Utils.parseLinkCommons(cosmicLink, "xdr", field, value, options)
    }
  })

  if (!xdr) throw new Error("Missing XDR parameter")
  options.stripNeutralSequence = true
  return { type: "xdr", value: xdr, options }
}

/**
 * Initialize cosmicLink using `sep7.pay`.
 * @private
 */
sep7Utils.parsePayLink = function (cosmicLink, sep7, options = {}) {
  const query = convert.uriToQuery(cosmicLink, sep7)
  const params = query.substr(1).split("&")

  const odesc = { type: "payment" },
    asset = {},
    memo = {}
  const tdesc = {
    network: options.network,
    operations: [odesc]
  }

  // Parse
  params.forEach((entry) => {
    const field = entry.replace(/=.*$/, "")
    const value = entry.substr(field.length + 1)

    switch (field) {
    case "destination":
    case "amount":
      odesc[field] = decode.field(cosmicLink, field, value)
      break
    case "asset_code":
      asset.code = decodeURIComponent(value)
      break
    case "asset_issuer":
      asset.issuer = decodeURIComponent(value)
      break
    case "memo_type":
      memo.type = value.split("_")[1].toLowerCase()
      break
    case "memo":
      memo.value = decode.string(cosmicLink, value)
      break
    default:
      sep7Utils.parseLinkCommons(cosmicLink, "pay", field, value, options)
    }
  })

  // Convert
  if (memo.type || memo.value) {
    if (memo.type === "hash" || memo.type === "return") {
      memo.value = Buffer.from(memo.value, "base64").toString("hex")
    }
    tdesc.memo = memo
  }
  if (asset.code || asset.issuer) odesc.asset = asset

  if (!odesc.destination) throw new Error("Missing parameter: destination")
  return { type: "tdesc", value: tdesc, options }
}

sep7Utils.parseLinkCommons = function (
  cosmicLink,
  mode,
  field,
  value,
  options
) {
  switch (field) {
  case "network_passphrase":
    options.network = decode.network(cosmicLink, value)
    break
  case "callback":
    value = decode.url(cosmicLink, value)
    if (value.substr(0, 4) !== "url:") {
      throw new Error("Invalid callback: " + value)
    }
    options.callback = value.substr(4)
    break
  case "origin_domain":
    cosmicLink.extra.originDomain = sep7Utils.verifySignature(
      cosmicLink,
      value
    )
    break
  case "signature":
    cosmicLink.extra.signature = decodeURIComponent(value)
    break
  case "msg":
    cosmicLink.extra.msg = decode.string(cosmicLink, value)
    break
  default:
    throw new Error(`Invalid SEP-0007 ${mode} field: ` + field)
  }
}

/* Signing */

sep7Utils.signLink = function (cosmicLink, domain, keypair) {
  if (!cosmicLink.locker) throw new Error("cosmicLink is not locked.")

  cosmicLink.extra.originDomain = domain
  delete cosmicLink.extra.signature
  delete cosmicLink._sep7

  const link = cosmicLink.sep7
  const payload = sep7Utils.makePayload(link)
  cosmicLink.extra.signature = keypair.sign(payload).toString("base64")
  delete cosmicLink._sep7
}

sep7Utils.verifySignature = async function (cosmicLink, domain) {
  const link = cosmicLink.sep7.replace(/&signature=.*/, "")

  // Let parser parse signature.
  await timeout(1)
  const signature = cosmicLink.extra.signature

  if (!signature) {
    throw new Error(`No signature attached for domain: ${domain}`)
  }

  const payload = sep7Utils.makePayload(link)
  const keypair = await sep7Utils.getDomainKeypair(domain)

  if (keypair.verify(payload, Buffer.from(signature, "base64"))) {
    return domain
  } else {
    throw new Error(`Invalid signature for domain: ${domain}`)
  }
}

sep7Utils.getDomainKeypair = async function (domain) {
  const toml = await StellarSdk.StellarTomlResolver.resolve(domain)
  const signingKey = toml.URI_REQUEST_SIGNING_KEY

  if (!signingKey) {
    throw new Error(`Can't find signing key for domain: ${domain}`)
  }

  return StellarSdk.Keypair.fromPublicKey(signingKey)
}

sep7Utils.makePayload = function (link) {
  return Buffer.concat([
    Buffer.alloc(35),
    Buffer.alloc(1, 4),
    Buffer.from(`stellar.sep.7 - URI Scheme${link}`)
  ])
}
