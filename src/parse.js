'use strict'
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

const helpers = require('./helpers')
const convert = require('./convert')
const status = require('./status')
const event = require('./event')

/**
 * Set `page` as the base URI for `cosmicLink`. Update the URI getter
 * accordingly.
 *
 * @param {CL}
 * @param {string} page URI basename
 */
parse.page = function (cosmicLink, page) {
  cosmicLink._page = encodeURI(page)
  parse.makeConverter(cosmicLink, 'query', 'uri')
  event.callFormatHandlers(cosmicLink, 'uri')
}

/**
 * Set `cosmicLink` `network`. Throw an error if `network` is not valid.
 *
 * @param {CL}
 * @param {string} network Either `public` or `test`
 */
parse.network = function (cosmicLink, network) {
  cosmicLink._network = network
  if (network === 'test') {
    cosmicLink.server = new StellarSdk.Server('https://horizon-testnet.stellar.org')
  } else if (network === 'public') {
    cosmicLink.server = new StellarSdk.Server('https://horizon.stellar.org')
  } else {
    cosmicLink.server = null
    status.fail(cosmicLink, 'Invalid network')
    status.error(cosmicLink, 'Invalid network: ' + network, 'throw')
  }
}

/**
 * Setup the network, the format converters for cosmicLink and call the format
 * handlers.
 *
 * @param {CL}
 * @param {*} value A transaction in any format
 * @param {Object} options Same options as {@see CosmicLink#constructor}
 */
parse.dispatch = function (cosmicLink, value, options = {}) {
  const type = guessType(value)
  const parser = typeParser[type]

  if (
    (type === 'uri' || type === 'query' || type === 'xdrUri') &&
    value.match('&network=')
  ) {
    cosmicLink._network = value.replace(/.*&network=/, '').replace(/&.*/, '')
  }
  parse.network(cosmicLink, cosmicLink.network)

  if (parser) parser(cosmicLink, value, options)
  else parse.typeTowardAll(cosmicLink, type, value, options)

  /// A transaction with sequence number uses xdrUri format.
  if (type === 'xdr' || type === 'transaction') {
    if (options.stripSource || options.stripSequence) {
      typeTowardXdr(cosmicLink, 'json')
    } else if (options.stripSignatures) {
      if (type === 'transaction') value.signatures = []
      if (type === 'xdr') typeTowardXdr(cosmicLink, 'transaction')
    }
    if (!options.stripSource && !options.stripSequence) {
      parse.makeConverter(cosmicLink, 'xdr', 'query', options)
      parse.makeConverter(cosmicLink, 'query', 'uri')
    }
  }

  event.callFormatHandlers(cosmicLink)
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
function guessType (value) {
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
  const page = uri.split('?')[0]
  const query = convert.uriToQuery(cosmicLink, uri)
  cosmicLink._page = encodeURI(page)
  parse.typeTowardAll(cosmicLink, 'query', query)
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
      case 'stripSignatures':
        options.stripSignatures = true
        break
      case 'stripSequence':
        options.stripSequence = true
        break
      case 'stripSource':
        options.stripSource = true
        break
      case 'network':
        options.network = value
        break
      default:
        status.fail(cosmicLink, 'Invalid query')
        status.error(cosmicLink, 'Unknow option: ' + entry)
    }
  })

  parse.dispatch(cosmicLink, xdr, options)
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
parse.typeTowardAll = function (cosmicLink, type, value, ...options) {
  if (type === 'tdesc') {
    type = 'json'
    value = convert.tdescToJson(cosmicLink, value, ...options)
  }

  parse.typeTowardAllUsingDelayed(cosmicLink,
    type,
    helpers.delay(() => value),
    ...options)
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
parse.typeTowardAllUsingDelayed = function (cosmicLink, type, delayed, ...options) {
  const getter = 'get' + helpers.capitalize(type)
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
 * @private
 * @param {CL}
 * @param {string} type One of 'uri', 'query', 'json', 'transaction'
 * @param {*} value The value of `type`
 */
function typeTowardXdr (cosmicLink, type, ...options) {
  switch (type) {
    case 'uri': parse.makeConverter(cosmicLink, 'uri', 'query', ...options)
    case 'query': parse.makeConverter(cosmicLink, 'query', 'json', ...options)
    case 'json': parse.makeConverter(cosmicLink, 'json', 'transaction', ...options)
    case 'transaction': parse.makeConverter(cosmicLink, 'transaction', 'xdr', ...options)
      break
    default: throw new Error('Invalid type: ' + type)
  }
}

/**
 * Setup format getters for `cosmicLink` starting from the one following `type`
 * until xdr. For example, if `type` is 'json', it will setup
 * `cosmicLink.getQuery` and `cosmicLink.getUri`.
 *
 * @private
 * @param {CL}
 * @param {string} type One of 'xdr', 'transaction', 'json', 'query'
 */
function typeTowardUri (cosmicLink, type, ...options) {
  switch (type) {
    case 'xdr': parse.makeConverter(cosmicLink, 'xdr', 'transaction', ...options)
    case 'transaction': parse.makeConverter(cosmicLink, 'transaction', 'json', ...options)
    case 'json': parse.makeConverter(cosmicLink, 'json', 'query', ...options)
    case 'query': parse.makeConverter(cosmicLink, 'query', 'uri', ...options)
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
parse.makeConverter = function (cosmicLink, from, to, ...options) {
  /**
   * @name CosmicLink#getUri
   * @function
   * @desc Returns a promise that resolves to the current transaction in URI format.
   * @async
   * @return {Promise}
   */

  /**
   * @name CosmicLink#getQuery
   * @function
   * @desc Returns a promise that resolves to the current transaction in query format.
   * @async
   * @return {Promise}
   */

  /**
   * @name CosmicLink#getJson
   * @function
   * @desc Returns a promise that resolves to the current transaction in json format.
   * @async
   * @return {Promise}
   */

  /**
   * @name CosmicLink#getTdesc
   * @function
   * @desc Returns a promise that resolves to the current transaction in tdesc format.
   * @async
   * @return {Promise}
   */

  /**
   * @name CosmicLink#getTransaction
   * @function
   * @desc Returns a promise that resolves to the current transaction in Transaction format.
   * @async
   * @return {Promise}
   */

  /**
   * @name CosmicLink#getXdr
   * @function
   * @desc Returns a promise that resolves to the current transaction in XDR format.
   * @async
   * @return {Promise}
   */
  const getFrom = 'get' + helpers.capitalize(from)
  const getTo = 'get' + helpers.capitalize(to)
  const converter = from + 'To' + helpers.capitalize(to)

  const getter = cosmicLink[getFrom]
  cosmicLink[getTo] = helpers.delay(async () => {
    const value = await getter()
    return convert[converter](cosmicLink, value, ...options)
  })
}
