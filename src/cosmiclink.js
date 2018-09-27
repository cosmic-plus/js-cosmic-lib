'use_strict'

const env = require('@cosmic-plus/jsutils/env')
const helpers = require('@cosmic-plus/jsutils/misc')

const action = require('./action')
const config = require('./config')
const convert = require('./convert')
const parse = require('./parse')
const resolve = require('./resolve')
const status = require('./status')

/// Web only
let html, format
if (env.isBrowser) {
  html = require('@cosmic-plus/jsutils/html')
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
    if (this.query) return this.page + this.query
  }

  /**
   * CosmicLink's query.
   */
  get query () {
    if (!this._query) {
      if (this.xdr) this._query = convert.xdrToQuery(this, this.xdr, { network: this.network })
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

  /**
   * CosmicLink's SEP-0007.
   */
  get sep7 () {
    if (!this._sep7) {
      if (!this.xdr) return undefined
      this._sep7 = convert.xdrToSep7(this, this.xdr)
    }
    return this._sep7
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

  /// Editor
  /**
   * Add/remove transaction fields and reparse the CosmicLink. `object` should
   * follow the Tdesc format, but fields can be written using query or StellarSdk
   * format as well.
   *
   * @example
   * cosmicLink.setTxFields({ minTime: '2018-10', maxTime: '2019-01' })
   *
   * @example
   * cosmicLink.setTxFields({ minTime: null, maxTime: null })
   *
   * @example
   * cosmicLink.setTxFields({ memo: 'Bonjour!' })
   *
   * @param {Object} object Transaction fields definition. Fields can be either
   *   written using the JSON format or the query format
   * @return {CosmicLink}
   */
  setTxFields (object) {
    checkLock(this)
    this.parse(Object.assign(this.tdesc, object))
    return this
  }

  /**
   * Add a new operation to CosmicLink. `params` should follow the Tdesc format,
   * but fields can be written using query or StellarSdk format as well.
   *
   * @example
   * cosmicLink.addOperation('payment', { destination: 'tips*cosmic.link', amount: 20 })
   *
   * @example
   * cosmicLink.addOperation('changeTrust', { asset: 'CNY:admin*ripplefox' })
   *
   * @example
   * cosmicLink.addOperation('changeTrust', { asset: { code: 'CNY', issuer: 'admin*ripplefox } })
   *
   * @example
   * cosmicLink.addOperation('changeTrust', { asset: new StellarSdk.Asset('CNY', ...) })
   *
   * @param string type The operation type.
   * @param {Object} params The operation parameters.
   * @return {CosmicLink}
   */
  addOperation (type, params) {
    checkLock(this)
    const odesc = Object.assign({ type: type }, params)
    this.tdesc.operations.push(odesc)
    this.parse(this.tdesc)
    return this
  }

  /**
   * Set/remove one of the CosmicLink operations. `params` should follow the
   * Tdesc format, but fields can be written using query or StellarSdk format
   * as well. If `type` is set to `null`, the operation at `index` is deleted.
   *
   * @example
   * cosmicLink.setOperation(1, 'setOptions', { homeDomain: 'example.org' })
   *
   * @example
   * cosmicLink.setOperation(2, null)
   *
   * @param {integer} index The operation index.
   * @param {type} type  The operation type.
   * @param {params} params The operation parameters.
   * @return {CosmicLink}
   */
  setOperation (index, type, params) {
    checkLock(this)
    if (!this.tdesc.operations[index]) {
      throw new Error(`Operation ${index} doesn't exists`)
    }

    if (type === null) {
      this.tdesc.operations.splice(index, 1)
    } else {
      this.tdesc.operations[index] = Object.assign({ type: type }, params)
      this.parse(this.tdesc)
    }
    return this
  }

  /// Actions
  /**
   * Select the network in use in this cosmic link. Returns the corresponding
   * Server object.
   *
   * @return {Server} A Stellar SDK Server object
   */
  selectNetwork () { return resolve.useNetwork(this) }
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
  get htmlDescription () {
    if (!this._htmlDescription) makeHtmlDescription(this)
    return this._htmlDescription
  }

  /// Leave undocumented for now.
  get transactionNode () { return html.grab('.CL_transactionNode', this.htmlDescription) }
  get statusNode () { return html.grab('.CL_statusNode', this.htmlDescription) }
  get signersNode () { return html.grab('.CL_signersNode', this.htmlDescription) }

  /// Backward compatibility (2018-09 -> 2019-03).
  get htmlNode () {
    helpers.deprecated('2019-03', 'cosmicLink.htmlNode', 'cosmicLink.htmlDescription')
    return this.htmlDescription
  }
}

/**
 * Initialize or reset a CosmicLink.
 *
 * @private
 */
function initCosmicLink (cosmicLink, transaction, options = {}) {
  checkLock(cosmicLink)

  /// Reset object in case of reparse.
  formatsFields.forEach(type => delete cosmicLink[type])
  cosmicLink.page = cosmicLink.page || options.page || config.page
  status.init(cosmicLink)

  /// Enable per CosmicLink destinations/accounts caching.
  cosmicLink.cache = { destination: {}, account: {} }

  parse.dispatch(cosmicLink, transaction, options)

  if (env.isBrowser) {
    if (!cosmicLink._htmlDescription) {
      /// #CL_htmlNode: Backward compatibility (2018-09 -> 2019-03).
      cosmicLink._htmlDescription = html.grab('#cosmiclink_description') || html.grab('#CL_htmlNode')
    }
    if (cosmicLink._htmlDescription) {
      if (cosmicLink.htmlDescription.id === 'CL_htmlNode') {
        helpers.deprecated('2019-03', 'id="CL_htmlNode"', 'id="cosmiclink_description"')
      }
      makeHtmlDescription(cosmicLink)
    }
  }
}
const formatsFields = ['_query', '_tdesc', '_json', '_transaction', '_xdr']

/**
 * Initialize CosmicLink html nodes.
 *
 * @private
 */
function makeHtmlDescription (cosmicLink) {
  let htmlDescription = cosmicLink._htmlDescription

  if (htmlDescription) {
    html.clear(htmlDescription)
    htmlDescription.className = 'cosmiclink_description'
  } else {
    htmlDescription = html.create('div', '.cosmiclink_description')
    cosmicLink._htmlDescription = htmlDescription
  }

  cosmicLink._transactionNode = format.tdesc(cosmicLink, cosmicLink.tdesc)
  cosmicLink._statusNode = status.makeHtmlNode(cosmicLink)
  cosmicLink._signersNode = html.create('div', '.CL_signersNode')

  html.append(htmlDescription,
    cosmicLink._transactionNode, cosmicLink._statusNode, cosmicLink._signersNode)
}

/**
 * Throw an error if CosmicLink is locked.
 * @private
 */
function checkLock (cosmicLink) {
  if (cosmicLink.locker) throw new Error('Cosmic link is locked.')
}

CosmicLink.prototype.__proto__ = config
module.exports = CosmicLink
