'use strict'

import * as action from './action'
import * as event from './event'
import * as parse from './parse'
import * as resolve from './resolve'
import * as status from './status'
import {delay} from './helpers'

let node, format
if (typeof document !== 'undefined') {
  node = require('./node')
  format = require('./format')
  require('./cosmic-lib.css')
} else if(typeof StellarSdk === 'undefined') {
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
 * @param {test|public} [userNetwork] The Stellar network to use, will be public
 *     by default.
 * @param {string} [userAddress] This is the fallback source address when none
 *     is specified from the transaction.
 * @param {Object} options Additional options
 */
// --- Constructor ---
// new CosmicLink(uri, "[userNetwork]", "[userAddress]")
// new CosmicLink(query, "[userNetwork]", "[userAddress]")
// new CosmicLink(transaction, "[userNetwork]", "[userAddress]", {options...})
// new CosmicLink(xdr, "[userNetwork]", "[userAddress]", {options...})
//
// --- Options for transaction & xdr ---
// stripSource = true   < Don't keep source account when converting to URI
// network = ...        < Specify a network for this transaction
//
// --- Formats (get) ---
// CosmicLink.getUri()          < Return a promise of the URI string
// CosmicLink.getQuery()        < Return a promise of the query string
// CosmicLink.getJson()         < Return stringified JSON of the object
// CosmicLink.getTdesc()        < Return a promise of the transaction descriptor
// CosmicLink.getTransaction()  < Return a promise of the transaction
// CosmicLink.getXdr()          < Return a promise of the transaction's XDR
//
// --- Formats (parse) ---    <<< Update everything on the go >>>
// *CosmicLink.parse          < Same use than constructor. Update the link.
//
// --- Datas ---           <<< Update everything on the go >>>
// CosmicLink.user         < User address
// *CosmicLink.aliases     < Local aliases for public keys
// CosmicLink.network      < Test/Public network
// CosmicLink.server       < The horizon server to use
// CosmicLink.getSource    < Transaction source
// CosmicLink.getSourceAccount  < Transaction source account object
// CosmicLink.getSigners   < Array of transaction legit signers
// CosmicLink.status       < Status of the CosmicLink (valid or specific error)
// CosmicLink.errors       < An array of errors (or undefined if no error)
// CosmicLink.page         < The base URI, without the query
//
// --- Tests ---
// CosmicLink.hasSigner(publicKey)   < Test if `publicKey` is a signer for CosmicLink
// CosmicLink.hasSigned(publicKey)   < Test if `publicKey` signature is available
//
// --- Actions ---
// *CosmicLink.resolve()       < Resolve addresses and fetch sequence for offline signing
// CosmicLink.sign("seed")     < Sign the transaction
// CosmicLink.send("[server]") < Send the transaction to the network
//
// --- Tools ---
// *CosmicLink.builder         < Builder akin to StellarSdk.TransactionBuilder
// CosmicLink.onClick.format   < For onClick events on the HTML description
// *CosmicLink.onParse.format  < Trigger when cosmicLink is re-parsed
//
// --- HTML Nodes ---
// CosmicLink.htmlNode         < HTML element for CosmicLink
// CosmicLink.transactionNode  < HTML description of the transaction
// CosmicLink.signersNode      < HTML element for the signers list
// CosmicLink.statusNode       < HTML element for the transaction status & errors

export class CosmicLink {
  constructor (transaction, network, user, options) {
    this.user = user
    if (network) this.network = network

    this._page = 'https://cosmic.link/'
    this.onClick = event.defaultHandler

    if (typeof document !== 'undefined') {
      let htmlNode = node.grab('#CL_htmlNode')
      /// Backward compatibility
      if (!htmlNode) htmlNode = node.grab('#CL_transactionNode')
      if (htmlNode) makeHtmlNodes(this, htmlNode)
    }

    parse.dispatch(this, transaction, options)

    /// Fallback to public only when network is not set from the URI.
    if (!this.network) this.network = 'public'

    this.getSourceAccount = delay(() => resolve.getSourceAccount(this))
    this.getSigners = delay(() => resolve.getSigners(this))
  }

  async getSource () {
    const tdesc = await this.getTdesc()
    if (tdesc.source) return tdesc.source
    else if (this.user) return this.user
    else throw new error ('No source defined for this transaction')
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

  /// Datas
  get page () {
    return this._page
  }
  set page (uri) {
    parse.setPage(this, uri)
  }

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
    node.create('h3', '.CL_status'),
    node.create('ul', '.CL_events')
  )

  if (cosmicLink.getTdesc) format.tdesc(cosmicLink)
  status.populateHtmlNode(cosmicLink)
}
