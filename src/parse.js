"use strict"
/**
 * Contains the methods to parse transactions in various format and create a
 * `CosmicLink` object out of them.
 *
 * Also contains methods to update some of the `CosmicLink` datas when it
 * require update/re-parse of part or totallity of the object.
 *
 * @private
 * @exports parse
 */
const parse = exports

const check = require("./check")
const convert = require("./convert")
const decode = require("./decode")
const expand = require("./expand")
const resolve = require("./resolve")
const sep7Utils = require("./sep7-utils")
const status = require("./status")

/**
 * Sets cosmicLink page as the base path of `uri`.
 *
 * @param {string} page URI basename
 */
parse.page = function (cosmicLink, uri) {
  const page = uri.split("?")[0]
  if (page) cosmicLink.page = encodeURI(page)
}

/**
 * Call the right functions to setup cosmicLink depending on `options` and
 * `value` type.
 *
 * @param {*} value A transaction in any format
 * @param {Object} options Same options as {@see CosmicLink#constructor}
 */
parse.dispatch = function (cosmicLink, value = "?", options = {}) {
  const type = guessType(value)

  // Strip out URL hash
  switch (type) {
  case "uri":
  case "query":
  case "xdrUri":
  case "sep7":
  case "sep7Request":
    value = value.replace(/#.*$/, "")
  }

  // Parse transaction
  try {
    if (parse.rule[type]) {
      const params = parse.rule[type](cosmicLink, value, options)
      setTdesc(cosmicLink, params.type, params.value, params.options)
    } else {
      setTdesc(cosmicLink, type, value, options)
    }
  } catch (error) {
    if (!cosmicLink.errors) {
      console.error(error)
      status.error(cosmicLink, error.message)
    }
    status.fail(cosmicLink, "Invalid " + type)
    if (error.tdesc) cosmicLink._tdesc = error.tdesc
  }

  // Asynchronously check SEP-0007 link.
  if (cosmicLink.extra.originDomain) {
    cosmicLink.verifySep7().catch((error) => {
      status.error(cosmicLink, error.message)
      status.fail(cosmicLink, "Invalid SEP-0007 link")
    })
  }

  if (options.page) parse.page(cosmicLink, options.page)
}

/**
 * Returns `type` which is the format of transaction represented by `value`.
 */
function guessType (value) {
  let type
  if (typeof value === "string") {
    const query = convert.uriToQuery("", value)
    if (value.substr(0, 12) === "web+stellar:") type = "sep7"
    else if (query && query.substr(0, 6) === "?sep7=") type = "sep7Request"
    // DEPRECATED since 2019-09-11 / `req=` is deprecated in favor of `sep7=`.
    else if (query && query.substr(0, 5) === "?req=") type = "sep7Request"
    else if (query && query.substr(0, 5) === "?xdr=") type = "xdrUri"
    else if (value.substr(0, 1) === "?") type = "query"
    else if (value.substr(0, 1) === "{") type = "json"
    else if (value.match(/^[a-zA-Z0-9+-=/]+$/)) type = "xdr"
    else type = "uri"
  } else {
    if (value.tx) type = "transaction"
    else type = "tdesc"
  }
  return type
}

/******************************************************************************/
/**
 * Parse-type type extension
 */
parse.rule = {}

/**
 * Initialize cosmicLink using `transaction`.
 */
parse.rule.transaction = function (cosmicLink, transaction, options) {
  const network = transaction._networkPassphrase
  if (network) {
    options.network = resolve.networkName(cosmicLink, network)
  }
  return { type: "transaction", value: transaction, options }
}

/**
 * Initialize cosmicLink using `xdrUri`.
 */
parse.rule.xdrUri = function (cosmicLink, xdrUri, options) {
  parse.page(cosmicLink, xdrUri)

  const query = convert.uriToQuery(cosmicLink, xdrUri)
  const temp = query.split("&")
  const xdr = decodeURIComponent(temp[0].substr(5))

  temp.slice(1).forEach((entry) => {
    let field = entry.replace(/=.*$/, "")
    let value = entry.substr(field.length + 1)

    switch (field) {
    case "strip":
      switch (value) {
      case "source":
      case "sequence":
      case "signatures":
        options.strip = value
        break
      default:
        throw new Error(`Invalid strip directive: strip=${value}`)
      }
      break
    case "network":
      options.network = decode.network(cosmicLink, value)
      break
    case "horizon":
    case "callback":
      options[field] = decode.url(cosmicLink, value)
      break

      // Backward compatibility, deprecated since the 2019-08-26.
    case "stripSignatures":
      options.strip = "signatures"
      break
    case "stripSequence":
      options.strip = "sequence"
      break
    case "stripSource":
      options.strip = "source"
      break

    default:
      status.error(cosmicLink, "Unknow option: " + entry)
      status.fail(cosmicLink, "Invalid query")
    }
  })

  return { type: "xdr", value: xdr, options }
}

/**
 * SEP-0007 parsing
 */
parse.rule.sep7Request = sep7Utils.parseRequest
parse.rule.sep7 = sep7Utils.parseLink

/******************************************************************************/

/**
 * Set cosmicLink_tdesc from format `type`. From there, the CosmicLink methods
 * can lazy-evaluate any requested format.
 */
function setTdesc (cosmicLink, type, value, options) {
  if (type !== "uri") cosmicLink["_" + type] = value

  switch (type) {
  case "uri":
    parse.page(cosmicLink, value)
    cosmicLink._query = convert.uriToQuery(cosmicLink, value, options)
    // eslint-disable-next-line no-fallthrough
  case "query":
    cosmicLink._tdesc = convert.queryToTdesc(
      cosmicLink,
      cosmicLink.query,
      options
    )
    delete cosmicLink._query
    break
  case "json":
    value = convert.jsonToTdesc(cosmicLink, value)
    // eslint-disable-next-line no-fallthrough
  case "tdesc":
    cosmicLink._tdesc = expand.tdesc(cosmicLink, value)
    delete cosmicLink._json
    check.tdesc(cosmicLink, cosmicLink.tdesc)
    break
  case "sep7":
    cosmicLink._xdr = convert.sep7ToXdr(cosmicLink, cosmicLink.sep7)
    // eslint-disable-next-line no-fallthrough
  case "xdr":
    cosmicLink._transaction = convert.xdrToTransaction(
      cosmicLink,
      cosmicLink.xdr,
      options
    )
    // eslint-disable-next-line no-fallthrough
  case "transaction":
    cosmicLink._tdesc = convert.transactionToTdesc(
      cosmicLink,
      cosmicLink.transaction,
      options
    )
    delete cosmicLink._sep7
    if (options.strip === "source" || options.strip === "sequence") {
      delete cosmicLink._xdr
      delete cosmicLink._transaction
    } else if (options.strip === "signatures") {
      const signatures = cosmicLink.transaction.signatures
      while (signatures.length) signatures.pop()
      delete cosmicLink._xdr
    }
  }
}
