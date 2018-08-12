'use_strict'

const action = require('./action')
const aliases = require('./aliases')
const defaults = require('./defaults')
const event = require('./event')
const parse = require('./parse')
const resolve = require('./resolve')
const status = require('./status')

const helpers = require('ticot-box/misc')
const envIsBrowser = require('ticot-box/envIsBrowser')

/// Web only
let html, format
if (envIsBrowser) {
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
 *
 * @borrows module:defaults.aliases as CosmicLink#aliases
 * @borrows module:defaults.addAliases as CosmicLink#addAliases
 * @borrows module:defaults.removeAliases as CosmicLink#removeAliases
 * @borrows module:defaults.clickHandlers as CosmicLink#clickHandlers
 * @borrows module:defaults.setClickHandler as CosmicLink#setClickHandler
 * @borrows module:defaults.clearClickHandler as CosmicLink#clearClickHandler
 * @borrows module:defaults.formatHandlers as CosmicLink#formatHandlers
 * @borrows module:defaults.addFormatHandler as CosmicLink#addFormatHandler
 * @borrows module:defaults.removeFormatHandler as CosmicLink#removeFormatHandler
 */
const CosmicLink = class {
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

  /**
   * Return the source address of the current transaction.
   *
   * @return {string} Federated address or account ID
   */
  async getSource () {
    const tdesc = await this.getTdesc()
    if (tdesc.source) return tdesc.source
    else if (this.user) return this.user
    else throw new Error('No source defined for this transaction')
  }

  /**
   * Check if `value` is a legit signer for this transaction.
   *
   * @param {string} value An account ID, a txhash or a preimage
   * @param {string} [type='key'] The signer type. Could be either `key`, `tx`
   *     or `hash`.
   * @return {Promise} A promise of a boolean telling if yes or no the signer is
   *     legit.
   */
  async hasSigner (value, type = 'key') {
    const signers = await this.getSigners()
    return signers.find(entry => entry.value === value && entry.type === type)
  }

  /**
   * Check if `value` has already signed the transaction.
   *
   * @param {string} value An account ID, a txhash or a preimage
   * @param {string} [type='key'] The signer type. Could be either `key`, `tx`
   *     or `hash`.
   * @return {Promise} A promise of a boolean telling if yes or no the `value`
   *     has already signed
   */
  async hasSigned (value, type = 'key') {
    return await resolve.hasSigned(this, type, value)
  }

  /// Actions
  /**
   * Select the network in use in this cosmic link. Returns the corresponding
   * Server object.
   *
   * @return {Server} A Stellar SDK Server object
   */
  selectNetwork () { return resolve.network(this, this.network) }
  sign (...keypairs_or_preimage) { return action.sign(this, ...keypairs_or_preimage) }
  send (server) { return action.send(this, server) }

  /// Aliases
  addAliases (aliasesArg) { aliases.add(this, aliasesArg) }
  removeAliases (array) { aliases.remove(this, aliases) }

  /// Handlers
  setClickHandler (fieldType, callback) {
    event.setClickHandler(this, fieldType, callback)
  }
  clearClickHandler (fieldType) {
    event.clearClickHandler(this, fieldType)
  }

  addFormatHandler (format, callback) {
    event.addFormatHandler(this, format, callback)
  }
  removeFormatHandler (format, callback) {
    event.removeFormatHandler(this, format, callback)
  }

  /// Datas
  /**
   * The base URI to use when converting to URI format.
   *
   * @alias CosmicLink.page
   */
  get page () { return this._page }
  set page (uri) { parse.page(this, uri) }

  /**
   * The network in use for this cosmic link.
   *
   * @alias CosmicLink.network
   */
  get network () { return this._network }
  set network (network) { throw new Error('network is read-only') }

  /**
   * The fallback user configured for this cosmic link. It doesn't always match
   * the transaction source, as the query may enforce another source. See
   * {@link CosmicLink#getSource} for a method that reliably returns the source
   * address.
   *
   * @alias CosmicLink.user
   */
  get user () { return this._user }
  set user (user) { throw new Error('user is read-only') }

  /**
   * The HTML DOM node that displays a description of the current transaction.
   * Contains {@link CosmicLink#transactionNode}, {@link CosmicLink#statusNode}
   * and {@link CosmicLink#signersNode}. Please note that thoses nodes are only
   * available in browser environment (i.e: not in node.js).
   *
   * If HTML your page contains an element with `id="CL_htmlNode"`, this node
   * will automatically be used as the htmlNode of any CosmicLink you create.
   * This implies you should have onle one living at a time.
   *
   * @alias CosmicLink.htmlNode
   */
  get htmlNode () {
    if (!this._htmlNode) makeHtmlNodes(this)
    return this._htmlNode
  }
  set htmlNode (value) { this._htmlNode = value }

  /**
   * The HTML element that contains a description of the current transaction.
   *
   * @alias CosmicLink.transactionNode
   */
  get transactionNode () {
    this.htmlNode
    return this._transactionNode
  }
  set transactionNode (value) { this._transactionNode = value }

  /**
   * The HTML node that contains a description of any error that may have
   * happened with this cosmic link.
   *
   * @alias CosmicLink.statusNode
   */
  get statusNode () {
    this.htmlNode
    return this._statusNode
  }
  set statusNode (value) { this._statusNode = value }

  /**
   * The HTML node that contains a list of missing/available signatures. Please
   * note that it doesn't shows when there's only one signer.
   *
   * @alias CosmicLink.signersNode
   */
  get signersNode () {
    this.htmlNode
    return this._signersNode
  }
  set signersNode (value) { this._signersNode = value }
}

function initCosmicLink (cosmicLink, transaction, options = {}) {
  cosmicLink._page = options.page || defaults.page
  cosmicLink._user = options.user || defaults.user
  /// May be overwritten by parse.dispatch()
  cosmicLink._network = options.network || defaults.network

  cosmicLink.errors = undefined
  cosmicLink.status = undefined

  cosmicLink.aliases = defaults.aliases
  cosmicLink.clickHandlers = Object.assign({}, defaults.clickHandlers)
  cosmicLink.formatHandlers = {}
  for (let format in defaults.formatHandlers) {
    const handlers = defaults.formatHandlers[format]
    cosmicLink.formatHandlers[format] = handlers.slice(0)
  }

  /**
   * Returns a promise of the transaction source
   * [Account]{@link https://www.stellar.org/developers/guides/concepts/accounts.html}
   * object from the current ledger.
   *
   * @alias CosmicLink#getSourceAccount
   * @function
   * @async
   * @return {Promise}
   */
  cosmicLink.getSourceAccount = helpers.delay(() => resolve.getSourceAccount(cosmicLink))

  /**
   * Returns the legit signers for this transaction.
   *
   * @name CosmicLink#getSigners
   * @function
   * @async
   * @return {Promise}
   */
  cosmicLink.getSigners = helpers.delay(() => resolve.signers(cosmicLink))

  if (typeof document !== 'undefined') {
    let htmlNode = html.grab('#CL_htmlNode')
    if (htmlNode) makeHtmlNodes(cosmicLink, htmlNode)
  }

  parse.dispatch(cosmicLink, transaction, options)

  if (cosmicLink._htmlNode) {
    cosmicLink.getTdesc()
      .then(tdesc => {
        try { format.tdesc(cosmicLink) } catch (error) { console.error(error) }
      })
      .catch(() => {})
  }
}

function makeHtmlNodes (cosmicLink, htmlNode) {
  if (!html) return

  if (htmlNode) {
    html.clear(htmlNode)
    htmlNode.className = 'CL_htmlNode'
  } else htmlNode = html.create('div', '.CL_htmlNode')
  cosmicLink._htmlNode = htmlNode

  const nodes = ['_transactionNode', '_statusNode', '_signersNode']
  for (let index in nodes) {
    const name = nodes[index]
    cosmicLink[name] = html.create('div', '.CL' + name)
    html.append(htmlNode, cosmicLink[name])
  }

  html.append(cosmicLink._statusNode,
    html.create('span', '.CL_status'),
    html.create('ul', '.CL_events')
  )

  if (cosmicLink.getTdesc) format.tdesc(cosmicLink)
  status.populateHtmlNode(cosmicLink)
}

module.exports = CosmicLink
