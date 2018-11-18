"use strict"
/**
 * Contains the methods to convert transactions between various formats.
 *
 * @private
 * @exports convert
 */
const convert = exports

const StellarSdk = require("@cosmic-plus/base/stellar-sdk")

const construct = require("./construct")
const decode = require("./decode")
const destruct = require("./destruct")
const encode = require("./encode")
const resolve = require("./resolve")

/** ****************************    URI -> XDR    ******************************/

convert.uriToQuery = function (conf, uri) {
  if (!uri.match(/\?/)) return null
  const query = uri.replace(/^[^?]*/, "")
  return query
}

convert.queryToTdesc = decode.query

convert.tdescToJson = function (conf, tdesc) {
  return JSON.stringify(tdesc, null, 2)
}

convert.tdescToTransaction = construct.transaction

convert.transactionToXdr = function (conf, transaction) {
  return transaction.toEnvelope().toXDR("base64")
}

convert.xdrToSep7 = function (conf, xdr, options) {
  let sep7 = "web+stellar:tx?xdr="
  sep7 += encodeURIComponent(xdr)
  if (options.network && options.network !== "public") {
    const passphrase = resolve.networkPassphrase(conf, options.network)
    sep7 += "&network_passphrase=" + encodeURIComponent(passphrase)
  }
  if (options.callback) sep7 += "&callback=" + encode.url(conf, options.callback)
  // Not part of the standard.
  // if (options.horizon) sep7 +="&horizon=" + encode.url(conf, options.horizon)

  return sep7
}

/** ****************************    XDR -> URI    ******************************/

convert.xdrToTransaction = function (conf, xdr, options = {}) {
  const transaction = new StellarSdk.Transaction(xdr)
  if (options.stripSignatures) transaction.signatures = []
  return transaction
}

convert.xdrToQuery = function (conf, xdr, options = {}) {
  let query = "?xdr=" + xdr
  if (options.network) query += "&network=" + encodeURIComponent(options.network)
  if (options.horizon) query += "&horizon=" + encode.url(conf, options.horizon)
  if (options.callback) query += "&callback=" + encode.url(conf, options.callback)
  return query
}

convert.transactionToTdesc = destruct.transaction

convert.jsonToTdesc = function (conf, json) {
  return JSON.parse(json)
}

convert.tdescToQuery = encode.query

convert.queryToUri = function (conf, query) {
  const page = conf.page || "https://cosmic.link"
  return page + query
}
