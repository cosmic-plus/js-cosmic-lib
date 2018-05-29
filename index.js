'use strict'

import nothing from './polyfill'

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
 * Cheat sheet:
 *```
// --- Constructor ---
// new CosmicLink(uri, "[userNetwork]", "[userAddress]")
// new CosmicLink(query, "[userNetwork]", "[userAddress]")
// new CosmicLink(transaction, "[userNetwork]", "[userAddress]", {...options})
// new CosmicLink(xdr, "[userNetwork]", "[userAddress]", {...options})
//
// --- Options for transaction & xdr ---
// stripSource = true      < Strip out source account
// stripSequence = true    < Strip out sequence number
// stripSignatures = true  < Strip out signatures
// network = ...           < Specify a network for this transaction (kept in URI after conversion)
//
// --- Edit ---
// CosmicLink.parse(any-format, {...options})
// *CosmicLink.setField(field, value)
// *CosmicLink.addOperation({...params})
// *CosmicLink.changeOperation(index, {...params})
// *CosmicLink.removeOperation(index)
//
// --- Formats (get) ---
// CosmicLink.getUri()          < Return a promise of the URI string
// CosmicLink.getQuery()        < Return a promise of the query string
// CosmicLink.getJson()         < Return stringified JSON of the object
// CosmicLink.getTdesc()        < Return a promise of the transaction descriptor
// CosmicLink.getTransaction()  < Return a promise of the transaction
// CosmicLink.getXdr()          < Return a promise of the transaction's XDR
//
// --- Handlers ---
// CosmicLink.addFormatHandler(format, callback)
// CosmicLink.removeFormatHandler(format, callback)
// callback will receive event = { cosmicLink: ..., value: ..., error: ... }
//
// --- Datas ---           <<< Update everything on the go >>>
// CosmicLink.user         < User address
// CosmicLink.network      < Test/Public network
// CosmicLink.server       < The horizon server to use
// CosmicLink.page         < The base URI, without the query
// CosmicLink.status       < Status of the CosmicLink (valid or specific error)
// CosmicLink.errors       < An array of errors (or undefined if no error)
//
// --- Datas (asynchronous) ---
// CosmicLink.getSource()         < Transaction source
// CosmicLink.getSourceAccount()  < Transaction source account object
// CosmicLink.getSigners()        < Array of legit signers
//
// --- Aliases ---
// CosmicLink.aliases                     < Local aliases for public keys
// CosmicLink.addAliases({id: name,...})  < Append new aliases
// CosmicLink.removeAliases([id...])      < Remove aliases
//
// --- Tests ---
// CosmicLink.hasSigner(publicKey)   < Test if `publicKey` is a signer for CosmicLink
// CosmicLink.hasSigned(publicKey)   < Test if `publicKey` signature is available
//
// --- Actions ---
// CosmicLink.selectNetwork()  < Select CosmicLink network for Stellar SDK
// CosmicLink.sign(seed)       < Sign the transaction
// CosmicLink.send([server])   < Send the transaction to the network
//
// --- Events ---
// CosmicLink.onClick.type      < For onClick events on the HTML description
//
// --- HTML Nodes ---
// CosmicLink.htmlNode         < HTML element for CosmicLink
// CosmicLink.transactionNode  < HTML description of the transaction
// CosmicLink.signersNode      < HTML element for the signers list
// CosmicLink.statusNode       < HTML element for the transaction status & errors
 * ```
 *
 * @constructor
 * @param {*} transaction
 * @param {test|public} [userNetwork] The Stellar network to use, will be public
 *     by default.
 * @param {string} [userAddress] This is the fallback source address when none
 *     is specified from the transaction.
 * @param {Object} options Additional options
 */
export class CosmicLink {
  constructor (transaction, network, user, options) {
    if (user) this.user = user
    if (network) this.network = network

    this.onClick = event.defaultHandler
    if (!this._page) this._page = CosmicLink.page
    this.aliases = CosmicLink.aliases

    this.formatHandlers = {}
    for (let format in CosmicLink.formatHandlers) {
      const handlers = CosmicLink.formatHandlers[format]
      this.formatHandlers[format] = handlers.slice(0)
    }

    if (typeof document !== 'undefined') {
      let htmlNode = node.grab('#CL_htmlNode')
      /// Backward compatibility
      if (!htmlNode) htmlNode = node.grab('#CL_transactionNode')
      if (htmlNode) makeHtmlNodes(this, htmlNode)
    }

    parse.dispatch(this, transaction, options)

    /// Fallback only when network is not set from the URI.
    if (!this.network) this.network = CosmicLink.network

    this.getSourceAccount = helpers.delay(() => resolve.getSourceAccount(this))
    this.getSigners = helpers.delay(() => resolve.signers(this))
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
  selectNetwork () { resolve.selectNetwork(this) }
  async sign (seed) { await action.sign(this, seed) }
  async send (server) { await action.send(this, server) }

  /// Aliases
  addAliases (aliasesArg) { aliases.add(this, aliasesArg) }
  removeAliases (array) { aliases.remove(this, aliases) }

  /// Datas
  get page () { return this._page }
  set page (uri) { parse.page(this, uri) }

  get network () { return this._network }
  set network (network) { parse.network(this, network) }

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

/// Class-wide configuration
CosmicLink.page = 'https://cosmic.link/'
CosmicLink.network = 'public'

CosmicLink.aliases = aliases.all
CosmicLink.addAliases = function (aliases) { aliases.add(CosmicLink, aliases) }
CosmicLink.removeAliases = function (array) { aliases.remove(CosmicLink, array) }

CosmicLink.formatHandlers = {}
CosmicLink.addFormatHandler = function (format, callback) {
  event.addFormatHandler(CosmicLink, format, callback)
}
CosmicLink.removeFormatHandler = function (format, callback) {
  event.removeFormatHandler(CosmicLink, format, callback)
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
