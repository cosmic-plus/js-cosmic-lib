'use_strict'

const action = require('./action')
const config = require('./config')
const convert = require('./convert')
const parse = require('./parse')
const resolve = require('./resolve')
const status = require('./status')

const env = require('ticot-box/env')

/// Web only
let html, format
if (env.isBrowser) {
  html = require('ticot-box/html')
  format = require('./format')
}

/**
 * @class CosmicLink
 *
 * A `CosmicLink` object represents a Stellar transaction. It can be created
 * from an actual cosmic link or any link build with a cosmic query, and
 * also from a Stellar Transaction object or its XDR representation.
 *
 * Additionally, it can be parsed from a **transaction descriptor**, which the
 * simplified format used is `js-cosmic-lib` to represent Stellar transaction.
 * This transaction descriptor can be written in its objectified form
 * (referred as **tdesc**) or stringified form (referred as **json**).
 */
const CosmicLink = class CosmicLink {
  /**
   * Create a new CosmicLink object. `transaction` can be one of the accepted
   * format: uri, query, json, tdesc, transaction or xdr.
   *
   * Uri & query are link formats and are written according to the Cosmic Link
   * protocol itself.
   *
   * Json & tdesc is the format this library is using internally to store
   * transaction data. json is the stringified form, while tdesc is the
   * objectified form. This format is made to be simple and convertible between
   * string and object without information loss.
   *
   * Transaction and xdr are refering to the standard format implemented in
   * official Stellar libraries, like
   * [js-stellar-sdk]{@link https://github.com/stellar/js-stellar-sdk}.
   *
   * @param {*} transaction A transaction in one of thoses formats: `uri`, `query`,
   *     `json`, `tdesc`, `transaction`, `xdr`
   * @param {Object} options Additional options
   * @param {string} options.page The base URI to use when converting transaction
   *     to URI format
   * @param {string} options.network The fallback network: either `public` or
   *     `test`. Please note that the query may enforce a different network.
   * @param {string} options.user The fallback transaction source account. Will
   *     take effect if the cosmic link doesn't include one. Note that XDR and
   *     Transaction format always include a source account.
   * @param {boolean} options.stripSignatures If set to a true value, will strip
   *     out signatures for XDR/Transaction formats.
   * @param {boolean} options.stripSequence If set to a true value, will strip
   *     out signatures and sequence number for XDR/Transaction formats.
   * @param {boolean} options.stripSource If set to a true value, will strip out
   *     signatures, sequence number and transaction source account for
   *     XDR/Transaction formats.
   * @return {CosmicLink} A CosmicLink object
   */
  constructor (transaction, options) {
    initCosmicLink(this, transaction, options)
  }

  /**
   * Re-parse this cosmic link. Usefull for implementing link editors.
   * The parameters are the same than [Constructor]{@link CosmicLink#Constructor}.
   *
   * @param {*} transaction A transaction in one of thoses formats: `uri`, `query`,
   *     `json`, `tdesc`, `transaction`, `xdr`
   * @param {Object} options Additional options
   * @param {string} options.page The base URI to use when converting transaction
   *     to URI format
   * @param {string} options.network The fallback network: either `public` or
   *     `test`. Please note that the query may enforce a different network.
   * @param {string} options.user The fallback transaction source account. Will
   *     take effect if the cosmic link doesn't include one. Note that XDR and
   *     Transaction format always include a source account.
   * @param {boolean} options.stripSignatures If set to a true value, will strip
   *     out signatures for XDR/Transaction formats.
   * @param {boolean} options.stripSequence If set to a true value, will strip
   *     out signatures and sequence number for XDR/Transaction formats.
   * @param {boolean} options.stripSource If set to a true value, will strip out
   *     signatures, sequence number and transaction source account for
   *     XDR/Transaction formats.
   * @return {CosmicLink} A CosmicLink object
   */
  parse (transaction, options) {
    initCosmicLink(this, transaction, options)
  }

  /// Formats
  /**
   * CosmicLink's URI.
   */
  get uri () {
    return this.page + this.query
  }

  /**
   * CosmicLink's query.
   */
  get query () {
    if (!this._query) {
      if (this.xdr) this._query = convert.xdrToQuery(this, this.xdr)
      else if (this.tdesc) this._query = convert.tdescToQuery(this, this.tdesc)
      else return undefined
    }
    return this._query
  }

  /**
   * CosmicLink's tdesc (stands for *Transaction Descriptor*). This is the
   * internal representation this library uses to manipulate transactions.
   */
  get tdesc () {
    if (!this._tdesc) {
      if (this.transaction) this._tdesc = convert.transactionToTdesc(this, this.transaction)
      else return undefined
    }
    return this._tdesc
  }

  /**
   * CosmicLink's stringified [*Transaction Descriptor*]{@link CosmicLink#tdesc}.
   */
  get json () {
    if (!this._json) this._json = convert.tdescToJson(this, this.tdesc)
    return this._json
  }

  /**
   * CosmicLink's {@link Transaction}.
   */
  get transaction () {
    return this._transaction
  }

  /**
   * CosmicLink's {@link XDR}.
   */
  get xdr () {
    if (!this._xdr) {
      if (!this.transaction) return undefined
      this._xdr = convert.transactionToXdr(this, this.transaction)
    }
    return this._xdr
  }

  /// Data
  /**
   * CosmicLink's {@link Transaction} main source.
   */
  get source () {
    if (this.locker) return this.locker.source
    else if (this.tdesc) return this.tdesc.source
  }

  /**
   * The network on which CosmicLink is valid.
   */
  get network () {
    if (this.locker) return this.locker.network
    else if (this.tdesc) return this.tdesc.network
  }

  /// Actions
  /**
   * Select the network in use in this cosmic link. Returns the corresponding
   * Server object.
   *
   * @return {Server} A Stellar SDK Server object
   */
  selectNetwork () { return resolve.network(this) }
  lock (options) { return action.lock(this, options) }
  sign (...keypairs_or_preimage) { return action.sign(this, ...keypairs_or_preimage) }
  send (server) { return action.send(this, server) }

  /**
   * The HTML DOM node that displays a description of the current transaction.
   * Contains {@link CosmicLink#transactionNode}, {@link CosmicLink#statusNode}
   * and {@link CosmicLink#signersNode}. Please note that thoses nodes are only
   * available in browser environment (i.e: not in node.js).
   *
   * If HTML your page contains an element with `id="CL_htmlNode"`, this node
   * will automatically be used as the htmlNode of any CosmicLink you create.
   * This implies you should have onle one living at a time.
   */
  get htmlNode () {
    if (!this._htmlNode) makeHtmlNodes(this)
    return this._htmlNode
  }
  set htmlNode (value) { this._htmlNode = value }

  /**
   * The HTML element that contains a description of the current transaction.
   */
  get transactionNode () {
    this.htmlNode
    return this._transactionNode
  }
  set transactionNode (value) { this._transactionNode = value }

  /**
   * The HTML node that contains a description of any error that may have
   * happened with this cosmic link.
   */
  get statusNode () {
    this.htmlNode
    return this._statusNode
  }
  set statusNode (value) { this._statusNode = value }

  /**
   * The HTML node that contains a list of missing/available signatures. Please
   * note that it doesn't shows when there's only one signer.
   */
  get signersNode () {
    this.htmlNode
    return this._signersNode
  }
  set signersNode (value) { this._signersNode = value }
}

/**
 * Initialize or reset a CosmicLink.
 *
 * @private
 */
function initCosmicLink (cosmicLink, transaction, options = {}) {
  /// Reset object in case of reparse.
  ['query', 'tdesc', 'json', 'transaction', 'xdr'].forEach(type => delete cosmicLink['_' + type])

  cosmicLink.page = cosmicLink.page || options.page || config.page

  /// Enable per CosmicLink destinations/accounts caching.
  cosmicLink.cache = cosmicLink.cache || { destination: {}, account: {} }

  parse.dispatch(cosmicLink, transaction, options)

  if (env.isBrowser) {
    if (!cosmicLink._htmlNode) cosmicLink._htmlNode = html.grab('#CL_htmlNode')
    if (cosmicLink._htmlNode) makeHtmlNodes(cosmicLink)
  }
}

/**
 * Initialize CosmicLink html nodes.
 *
 * @private
 */
function makeHtmlNodes (cosmicLink) {
  let htmlNode = cosmicLink._htmlNode

  if (htmlNode) {
    html.clear(htmlNode)
    htmlNode.className = 'CL_htmlNode'
  } else {
    htmlNode = html.create('div', '.CL_htmlNode')
    cosmicLink._htmlNode = htmlNode
  }

  if (cosmicLink.tdesc) {
    const transactionNode = format.tdesc(cosmicLink, cosmicLink.tdesc)
    cosmicLink._transactionNode = transactionNode
    html.append(htmlNode, transactionNode)
  }

  const nodes = ['_statusNode', '_signersNode']
  for (let index in nodes) {
    const name = nodes[index]
    cosmicLink[name] = html.create('div', '.CL' + name)
    html.append(htmlNode, cosmicLink[name])
  }

  html.append(cosmicLink._statusNode,
    html.create('span', '.CL_status'),
    html.create('ul', '.CL_events')
  )
  status.populateHtmlNode(cosmicLink)
}

CosmicLink.prototype.__proto__ = config
module.exports = CosmicLink
