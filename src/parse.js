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

const convert = require('./convert')
const event = require('./event')
const status = require('./status')

/**
 * Sets cosmicLink page as the base path of `uri`.
 *
 * @param {string} page URI basename
 */
parse.page = function (cosmicLink, uri) {
  const page = uri.split('?')[0]
  if (page) cosmicLink.page = encodeURI(page)
}

/**
 * Call the right functions to setup cosmicLink depending on `options` and
 * `value` type.
 *
 * @param {*} value A transaction in any format
 * @param {Object} options Same options as {@see CosmicLink#constructor}
 */
parse.dispatch = function (cosmicLink, value, options = {}) {
  const type = guessType(value)

  try {
    if (type === 'xdrUri') parseXdrUri(cosmicLink, value, options)
    else setTdesc(cosmicLink, type, value, options)
  } catch (error) {
    console.error(error)
    status.error(cosmicLink, error.message)
    if (!cosmicLink.status) status.fail(cosmicLink, 'Invalid ' + type)
  }

  if (options.page) parse.page(cosmicLink, options.page)
  event.callFormatHandlers(cosmicLink)
}

/**
 * Returns `type` which is the format of transaction represented by `value`.
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
 * Initialize cosmicLink using `xdrUri`.
 */
function parseXdrUri (cosmicLink, xdrUri, options) {
  parse.page(cosmicLink, xdrUri)

  const query = convert.uriToQuery(cosmicLink, xdrUri)
  const temp = query.split('&')
  const xdr = temp[0].substr(5)

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

  setTdesc(cosmicLink, 'xdr', xdr, options)
}

/**
 * Set cosmicLink_tdesc from format `type`. From there, the CosmicLink methods
 * can lazy-evaluate any requested format.
 */
function setTdesc (cosmicLink, type, value, options) {
  if (value !== 'uri') cosmicLink['_' + type] = value

  switch (type) {
    case 'uri':
      parse.page(cosmicLink, value)
      cosmicLink._query = convert.uriToQuery(cosmicLink, value, options)
    case 'query':
      cosmicLink._tdesc = convert.queryToTdesc(cosmicLink, cosmicLink.query, options)
      break
    case 'json':
      cosmicLink._tdesc = convert.jsonToTdesc(cosmicLink, cosmicLink.json)
      break
    case 'xdr':
      cosmicLink._transaction = convert.xdrToTransaction(cosmicLink, cosmicLink.xdr, options)
    case 'transaction':
      cosmicLink._tdesc = convert.transactionToTdesc(cosmicLink, cosmicLink.transaction, options)
      if (options.stripSource || options.stripSequence) {
        delete cosmicLink._xdr
        delete cosmicLink._transaction
      } else {
        if (options.stripSignatures) cosmicLink.transaction.signatures = []
        delete cosmicLink._xdr
      }
  }
}
