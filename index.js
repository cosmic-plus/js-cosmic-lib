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
 * A `CosmicLink` object represents a Stellar transaction. It can be created
 * from an actual cosmic link or any link build with a cosmic link query, but
 * also from a Stellar Transaction object or its XDR representation.
 *
 * Additionally, it can be parsed from a `transaction descriptor`, which the
 * simplified format `CosmicLink`s are using to represent Stellar transaction.
 * This `transaction descriptor` can be written in its objectified form
 * (referred as `tdesc`) or stringified form (referred as `json`).
 *
 * To make a `CosmicLink` object, you'll need to provide the network on wich
 * it is valid, and may want to provide a default user, which could be your
 * accountID or the accountID of anybody using your service.
*
 * @constructor
 * @param {*} transaction
 * @param {Object} options Additional options
 */
const CosmicLink = module.exports = class CosmicLink {
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

  parse (transaction, options) {
    parse.dispatch(this, transaction, options)
  }

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
  selectNetwork () { resolve.network(this, this.network) }
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
  get page () { return this._page }
  set page (uri) { parse.page(this, uri) }

  get network () { return this._network }
  set network (network) { throw new Error('network is read-only') }

  get user () { return this._user }
  set user (user) { throw new Error('user is read-only') }

  /// HTML
  get htmlNode () {
    if (!this._htmlNode) makeHtmlNodes(this)
    return this._htmlNode
  }
  set htmlNode (value) { this._htmlNode = value }

  get transactionNode () {
    this.htmlNode
    return this._transactionNode
  }
  set transactionNode (value) { this._transactionNode = value }

  get statusNode () {
    this.htmlNode
    return this._statusNode
  }
  set statusNode (value) { this._statusNode = value }

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
