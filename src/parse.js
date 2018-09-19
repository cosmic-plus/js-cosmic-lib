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

const check = require('./check')
const convert = require('./convert')
const event = require('./event')
const expand = require('./expand')
const specs = require('./specs')
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
parse.dispatch = function (cosmicLink, value = '?', options = {}) {
  const type = guessType(value)

  try {
    if (parseFmt[type]) parseFmt[type](cosmicLink, value, options)
    else setTdesc(cosmicLink, type, value, options)
  } catch (error) {
    console.error(error)
    status.fail(cosmicLink, 'Invalid ' + type)
    if (!cosmicLink.errors) status.error(cosmicLink, error.message)
    if (error.tdesc) cosmicLink._tdesc = error.tdesc
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
    if (value.substr(0, 12) === 'web+stellar:') type = 'sep7'
    else if (query && query.substr(0, 5) === '?xdr=') type = 'xdrUri'
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

/******************************************************************************/

const parseFmt = {}

/**
 * Initialize cosmicLink using `xdrUri`.
 */
parseFmt.xdrUri = function (cosmicLink, xdrUri, options) {
  parse.page(cosmicLink, xdrUri)

  const query = convert.uriToQuery(cosmicLink, xdrUri)
  const temp = query.split('&')
  const xdr = temp[0].substr(5)

  options.network = 'public'
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
 * Initialize cosmicLink using `sep7`.
 */
parseFmt.sep7 = function (cosmicLink, sep7, options = {}) {
  if (sep7.substr(12, 4) === 'pay?') {
    throw new Error("SEP-0007 'pay' operation is not currently supported.")
  } else if (sep7.substr(12, 3) !== 'tx?') {
    throw new Error('Invalid SEP-0007 link.')
  }

  const query = convert.uriToQuery(cosmicLink, sep7)
  const params = query.substr(1).split('&')
  if (!options.network) options.network = 'public'
  let xdr

  params.forEach(entry => {
    const field = entry.replace(/=.*$/, '')
    const value = entry.substr(field.length + 1)

    if (!isValidSep7Field('tx', field)) {
      throw new Error('Invalid SEP-0007 field: ' + field)
    }

    if (isIgnoredSep7Field(field)) {
      console.warn('Ignored SEP-0007 field: ' + field)
    }

    if (field === 'xdr') xdr = decodeURIComponent(value)
    if (field === 'network_passphrase') options.network = decodeURIComponent(value)
  })

  setTdesc(cosmicLink, 'xdr', xdr, options)
}

function isValidSep7Field (sep7Op, field) {
  return specs.sep7MandatoryFields[sep7Op].find(name => name === field) ||
    specs.sep7OptionalFields[sep7Op].find(name => name === field)
}

function isIgnoredSep7Field (field) {
  return specs.sep7IgnoredFields.find(name => name === field)
}

/******************************************************************************/

/**
 * Set cosmicLink_tdesc from format `type`. From there, the CosmicLink methods
 * can lazy-evaluate any requested format.
 */
function setTdesc (cosmicLink, type, value, options) {
  if (type !== 'uri') cosmicLink['_' + type] = value

  switch (type) {
    case 'uri':
      parse.page(cosmicLink, value)
      cosmicLink._query = convert.uriToQuery(cosmicLink, value, options)
    case 'query':
      cosmicLink._tdesc = convert.queryToTdesc(cosmicLink, cosmicLink.query, options)
      break
    case 'json':
      value = convert.jsonToTdesc(cosmicLink, value)
    case 'tdesc':
      cosmicLink._tdesc = expand.tdesc(cosmicLink, value)
      delete cosmicLink._json
      check.tdesc(cosmicLink, cosmicLink.tdesc)
      break
    case 'sep7':
      cosmicLink._xdr = convert.sep7ToXdr(cosmicLink, cosmicLink.sep7)
    case 'xdr':
      cosmicLink._transaction = convert.xdrToTransaction(cosmicLink, cosmicLink.xdr, options)
    case 'transaction':
      cosmicLink._tdesc = convert.transactionToTdesc(cosmicLink, cosmicLink.transaction, options)
      if (options.stripSource || options.stripSequence) {
        delete cosmicLink._xdr
        delete cosmicLink._transaction
      } else {
        if (options.stripSignatures) {
          cosmicLink.transaction.signatures = []
          delete cosmicLink._xdr
        }
      }
  }
}
