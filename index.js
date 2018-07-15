'use strict'

require('./polyfill')

const helpers = require('./helpers')
const action = require('./action')
const event = require('./event')
const parse = require('./parse')
const resolve = require('./resolve')
const status = require('./status')
const aliases = require('./aliases')

let node, format
if (typeof document !== 'undefined') {
  node = require('./node')
  format = require('./format')
  require('./cosmic-lib.css')
} else if (typeof StellarSdk === 'undefined') {
  global.StellarSdk = require('stellar-sdk')
}

/**
 * @class
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
 * @borrows module:defaults.clickHandlers as CosmicLink#clickHandlers
 * @borrows module:defaults.setClickHandler as CosmicLink#setClickHandler
 * @borrows module:defaults.clearClickHandler as CosmicLink#clearClickHandler
 * @borrows module:defaults.formatHandlers as CosmicLink#formatHandlers
 * @borrows module:defaults.addFormatHandler as CosmicLink#addFormatHandler
 * @borrows module:defaults.removeFormatHandler as CosmicLink#removeFormatHandler
 */
const CosmicLink = class CosmicLink {
   /**
    * @constructor
    * @param {*} transaction A transaction in one of thoses formats: `uri`, `query`,
    *     `json`, `tdesc`, `transaction`, `xdr`
    * @param {Object} options Additional options
    */
  constructor (transaction, options) {
    this.aliases = CosmicLink.defaults.aliases
    this.clickHandlers = Object.assign({}, CosmicLink.defaults.clickHandlers)
    this.formatHandlers = {}
    for (let format in CosmicLink.defaults.formatHandlers) {
      const handlers = CosmicLink.defaults.formatHandlers[format]
      this.formatHandlers[format] = handlers.slice(0)
    }

    if (typeof document !== 'undefined') {
      let htmlNode = node.grab('#CL_htmlNode')
      /// Backward compatibility
      if (!htmlNode) htmlNode = node.grab('#CL_transactionNode')
      if (htmlNode) makeHtmlNodes(this, htmlNode)
    }

    parse.dispatch(this, transaction, options)
  }

  /**
   * Re-parse this cosmic link. Usefull for implementing link editors.
   */
  parse (transaction, options) {
    parse.dispatch(this, transaction, options)
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

  async hasSigner (value, type = 'key') {
    const signers = await this.getSigners()
    return signers.find(entry => entry.value === value && entry.type === type)
  }

  async hasSigned (value, type = 'key') {
    return await resolve.hasSigned(this, type, value)
  }

  /// Actions
  /**
   * Select the network in use in this cosmic link. Returns the corresponding
   * Server object.
   *
   * @returns {Server} A Stellar SDK Server object
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
   */
  get page () { return this._page }
  set page (uri) { parse.page(this, uri) }

  /**
   * The network in use for this cosmic link.
   */
  get network () { return this._network }
  set network (network) { throw new Error('network is read-only') }

  /**
   * The fallback user configured for this cosmic link. It doesn't always match
   * the transaction source, as the query may enforce another source. See
   * {@link CosmicLink#getSource} for a method that reliably returns the source
   * address.
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

function makeHtmlNodes (cosmicLink, htmlNode) {
  if (htmlNode) {
    node.clear(htmlNode)
    htmlNode.className = 'CL_htmlNode'
  } else htmlNode = node.create('div', '.CL_htmlNode')
  cosmicLink._htmlNode = htmlNode

  const nodes = ['_transactionNode', '_statusNode', '_signersNode']
  for (let index in nodes) {
    const name = nodes[index]
    cosmicLink[name] = node.create('div', '.CL' + name)
    node.append(htmlNode, cosmicLink[name])
  }

  node.append(cosmicLink._statusNode,
    node.create('span', '.CL_status'),
    node.create('ul', '.CL_events')
  )

  if (cosmicLink.getTdesc) format.tdesc(cosmicLink)
  status.populateHtmlNode(cosmicLink)
}

CosmicLink.defaults = require('./defaults')

module.exports = CosmicLink
