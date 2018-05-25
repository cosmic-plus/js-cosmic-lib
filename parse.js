'use strict'

import {capitalize, delay} from './helpers'

import * as convert from './convert'
import * as format from './format'
import * as status from './status'
import * as event from './event'

/**
 * Contains the methods to parse transactions in various format and create a
 * `CosmicLink` object out of them.
 *
 * Also contains methods to update some of the `CosmicLink` datas when it
 * require update/re-parse of part or totallity of the object.
 *
 * @module
 */

/**
 * Set `page` as the base URI for `cosmicLink`. Update the URI getter
 * accordingly.
 */
export function setPage (cosmicLink, page) {
  cosmicLink._page = encodeURI(page)
  makeConverter(cosmicLink, 'query', 'uri')
}

/**
 * Set `cosmicLink` `network`. Throw an error if `network` is not valid.
 *
 * @param {CL}
 * @param {string} network Either `public` or `test`
 */
export function network (cosmicLink, network) {
  cosmicLink._network = network
  if (network === 'test') {
    cosmicLink.server = new StellarSdk.Server('https://horizon-testnet.stellar.org')
  } else if (network === 'public') {
    cosmicLink.server = new StellarSdk.Server('https://horizon.stellar.org')
  } else {
    cosmicLink.server = null
    status.error(cosmicLink, 'Invalid network: ' + network, 'throw')
  }
}

/**
 * Setup the getters for each format form `cosmicLink`, using `value` and
 * `...options` as input. The six getters are:
 * * CosmicLink.getUri()
 * * CosmicLink.getQuery()
 * * CosmicLink.getTdesc()
 * * CosmicLink.getJson()
 * * CosmicLink.getTransaction()
 * * CosmicLink.getXdr()
 * Each format offers a way to represent the same transaction. This function
 * only setup the getters, which returns a promise resolving to the transaction
 * in the corresponding format. The conversion only occurs if/when the getter
 * is called.
 *
 * @param {CL}
 * @param {string|Object} value A transaction in on of the supported format
 * @param {Object} options The options as specified for CosmicLink constructor
 * @return {void}
 */
export function dispatch (cosmicLink, value, options) {
  const type = _guessType(value)
  const parser = typeParser[type]
  if (parser) parser(cosmicLink, value, options)
  else typeTowardAll(cosmicLink, type, value, options)

  if (cosmicLink._transactionNode) {
    cosmicLink.getTdesc()
      .then(tdesc => format.tdesc(cosmicLink, tdesc))
      .catch(console.log)
  }
}

/**
 * Returns `type` which is the format of transaction represented by `value`.
 *
 * @private
 * @param {string|Object} value Either a cosmic link, a query, a `transaction
 *     descriptor` formatted as object or JSON, a Stellar Transaction object or
 *     a Stellar transaction XDR.
 * @return {string} type Type of `value`
 */
function _guessType (value) {
  let type
  if (typeof value === 'string') {
    const query = convert.uriToQuery('', value)
    if (query && query.substr(0, 5) === '?xdr=') type = 'xdrUri'
    else if (value.substr(0, 1) === '?') type = 'query'
    else if (value.substr(0, 1) === '{') type = 'json'
    else if (value.match(/^[a-zA-Z0-9+-=/]+$/)) type = 'xdr'
    else type = 'uri'
  } else {
    if (value.tx) type = 'transaction'
    else type = 'tdesc'
  }
  return type
}

/**
 * Per-type customization of the generic parsing process.
 *
 * @private
 * @namespace
 */
const typeParser = {}

typeParser.uri = function (cosmicLink, uri) {
  const page = uri.replace(/[?][^?]*$/, '')
  const query = convert.uriToQuery(cosmicLink, uri)

  cosmicLink._page = encodeURI(page)
  typeParser.query(cosmicLink, query)
}

/// Immediate JSON conversion for accurate cosmicLink.network value when network
/// field is set.
typeParser.query = function (cosmicLink, query) {
  try {
    const json = convert.queryToJson(null, query)
    typeTowardAll(cosmicLink, 'json', json)
    cosmicLink.getQuery = delay(() => query)
    makeConverter(cosmicLink, 'query', 'uri')
  } catch (error) {
    typeTowardAll(cosmicLink, 'query', query)
  }
}

typeParser.xdrUri = function (cosmicLink, xdrUri) {
  const page = xdrUri.split('?')[0]
  if (page) cosmicLink._page = encodeURI(page)

  const query = convert.uriToQuery(cosmicLink, xdrUri)
  const temp = query.split('&')
  const xdr = temp[0].substr(5)

  let options = {}
  temp.slice(1).forEach(entry => {
    let field = entry.replace(/=.*$/, '')
    let value = entry.substr(field.length + 1)

    switch (field) {
      case 'stripSource':
        options.stripSource = true
        break
      case 'network':
        if (!cosmicLink._network) cosmicLink._network = value
        options.network = value
        break
      default:
        status.fail(cosmicLink, 'Invalid query')
        status.error(cosmicLink, 'Unknow option: ' + entry)
    }
  })

  let transaction
  try {
    transaction = new StellarSdk.Transaction(xdr)
  } catch (error) {
    console.log(error)
    status.fail(cosmicLink, 'Invalid XDR')
  }

  if (!cosmicLink.status) {
    typeTowardAll(cosmicLink, 'transaction', transaction, options)
    if (options.stripSource) {
      typeTowardAllUsingDelayed(cosmicLink, 'query', cosmicLink.getQuery)
    } else {
      cosmicLink.getQuery = delay(() => xdrUri)
      typeTowardUri(cosmicLink, 'query')
    }
  } else {
    typeTowardAllUsingDelayed(cosmicLink, 'transaction',
      delay(() => { throw new Error(cosmicLink.status) }))
  }
}

/**
 * Setup all formats getters for `cosmicLink` using entry point `value`, which
 * is a transaction formatted in `type`.
 *
 * @param {CL}
 * @param {string} type One of 'uri', 'query', 'json', 'tdesc', 'transaction' or
 *                      'xdr'
 * @param {*} value The value for `type`
 */
function typeTowardAll (cosmicLink, type, value, ...options) {
  if (type === 'tdesc') {
    type = 'json'
    value = convert.tdescToJson(cosmicLink, value, ...options)
  }

  typeTowardAllUsingDelayed(cosmicLink, type, delay(() => value), ...options)
}

/**
 * Setup all formats getters for `cosmicLink` using entry point `delayed`. Here
 * we name `delayed` a function that returns a promise of the transaction
 * formatted in `type`.
 *
 * @param {CL}
 * @param {string} type One of 'uri', 'query', 'json', 'tdesc', 'transaction' or
 *                      'xdr'
 * @param {function} delayed A function that return a promise for `type`
 */
export function typeTowardAllUsingDelayed (cosmicLink, type, delayed, ...options) {
  const getter = 'get' + capitalize(type)
  cosmicLink[getter] = delayed

  if (type !== 'xdr') typeTowardXdr(cosmicLink, type, ...options)
  if (type !== 'uri') typeTowardUri(cosmicLink, type, ...options)
  cosmicLink.getTdesc = async () => {
    const json = await cosmicLink.getJson()
    return convert.jsonToTdesc(cosmicLink, json)
  }
}

/**
 * Setup format getters for `cosmicLink` starting from the one following `type`
 * until xdr. For example, if `type` is 'query', it will setup
 * `cosmicLink.getJson`, `cosmicLink.getTransaction` and `cosmicLink.getXdr`.
 *
 *
 * @param {CL}
 * @param {string} type One of 'uri', 'query', 'json', 'transaction'
 * @param {*} value The value of `type`
 */
function typeTowardXdr (cosmicLink, type, ...options) {
  switch (type) {
    case 'uri': makeConverter(cosmicLink, 'uri', 'query', ...options)
    case 'query': makeConverter(cosmicLink, 'query', 'json', ...options)
    case 'json': makeConverter(cosmicLink, 'json', 'transaction', ...options)
    case 'transaction': makeConverter(cosmicLink, 'transaction', 'xdr', ...options)
      break
    default: throw new Error('Invalid type: ' + type)
  }
}

/**
 * Setup format getters for `cosmicLink` starting from the one following `type`
 * until xdr. For example, if `type` is 'json', it will setup
 * `cosmicLink.getQuery` and `cosmicLink.getUri`.
 *
 * @param {CL}
 * @param {string} type One of 'xdr', 'transaction', 'json', 'query'
 */
function typeTowardUri (cosmicLink, type, ...options) {
  switch (type) {
    case 'xdr': makeConverter(cosmicLink, 'xdr', 'transaction', ...options)
    case 'transaction': makeConverter(cosmicLink, 'transaction', 'json', ...options)
    case 'json': makeConverter(cosmicLink, 'json', 'query', ...options)
    case 'query': makeConverter(cosmicLink, 'query', 'uri', ...options)
      break
    default: throw new Error('Invalid type: ' + type)
  }
}

/**
 * Setup format getter get`to` for `cosmicLink` using `from`. In other words,
 * if `from` is 'uri' and `to` is 'query', it will setup `cosmicLink.getQuery`
 * to be computed from uri.
 *
 * This function uses existing conversion functions in 'convert' module.
 * i.e.: arbitrary conversion like from query to transaction won't do.
 *
 * @param {CL}
 * @param {string} from One of 'uri', 'query', 'json', 'tdesc', 'transaction' or
 *                      'xdr'
 * @param {string} to One of 'uri', 'query', 'json', 'tdesc', 'transaction' or
 *                    'xdr'
 */
function makeConverter (cosmicLink, from, to, ...options) {
  const getFrom = 'get' + capitalize(from)
  const getTo = 'get' + capitalize(to)
  const converter = from + 'To' + capitalize(to)

  const getter = cosmicLink[getFrom]
  cosmicLink[getTo] = delay(async () => {
    const value = await getter()
    return convert[converter](cosmicLink, value, ...options)
  })

  event.callFormatHandlers(cosmicLink, to)
}
