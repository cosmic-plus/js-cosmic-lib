'use strict'

import * as action from './action'
import * as node from './node'
import * as event from './event'
import * as parse from './parse'
import * as status from './status'

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
 * @param {test|public} [network] The Stellar network to use, will be public by
 *     default.
 * @param {string} [userAddress] In the context of cosmic link parsing, the
 *     fallback address to use in case there's no source specified for the
 *     transaction. In the context of XDR/Transaction object parsing, set this
 *     to any true value if you want the transaction source to be "enforced"
 *     by the produced cosmic link.
 */
// --- Constructor ---
// new CosmicLink("uri", "[network]", "[userAddress]")
// new CosmicLink("xdr", "[network]", "[keepUser]")
//
// --- Formats (get) ---        <<< Return promises >>>
// CosmicLink.getUri()          < The URI string
// CosmicLink.getQuery()        < The query string
// CosmicLink.getJson()         < A stringified JSON of the object
// CosmicLink.getObject()       < A promised simplified object representation of transaction
// CosmicLink.getTransaction()  < A promise of the transaction
// CosmicLink.getXdr()          < A promise of the transaction's XDR
//
// --- Formats (parse) ---    <<< Update everything on the go >>>
// *CosmicLink.parse          < Same use than constructor. Update the link.
//
// --- Datas ---           <<< Update everything on the go >>>
// CosmicLink.user         < User publicKey
// *CosmicLink.aliases     < Local aliases for public keys
// CosmicLink.network      < Test/Public/Private network
// CosmicLink.server       < Address of the horizon server
// CosmicLink.status       < Status of the CosmicLink (valid or specific error)
// CosmicLink.errors       < An array of errors (or undefined if no error)
// CosmicLink.page         < Optionally the Uri that handle the querry
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
// CosmicLink.transactionNode  < HTML description of the transaction
// CosmicLink.statusNode       < HTML box for the signing & sending status

export class CosmicLink {
  constructor (transaction, network, user) {
    setDefaults(this, network, user)
    parse.dispatch(this, transaction, user)
  }

  /// Actions
  async sign (seed) { await action.sign(this, seed) }
  async send (server) { await action.send(this, server) }

  /// Datas
  get page () {
    return this._page
  }
  set page (uri) {
    parse.setPage(this, uri)
  }
}

function setDefaults (cosmicLink, network = 'public', user) {
  cosmicLink.onClick = event.defaultHandler

  cosmicLink.page = 'https://cosmic.link/'

  makeHtmlNodes(cosmicLink)

  cosmicLink.user = user

  if (network === 'test') {
    cosmicLink.network = 'test'
    cosmicLink.server = new StellarSdk.Server('https://horizon-testnet.stellar.org')
  } else if (network === 'public' || !network) {
    cosmicLink.network = 'public'
    cosmicLink.server = new StellarSdk.Server('https://horizon.stellar.org')
  } else {
    status.fail(cosmicLink, 'Invalid network: ' + network)
  }
}

function makeHtmlNodes (cosmicLink) {
  let transactionNode = node.grab('#CL_transactionNode')
  if (transactionNode) {
    node.clear(transactionNode)
    transactionNode.className = 'CL_transactionNode'
  } else {
    transactionNode = node.create('div', '.CL_transactionNode')
  }
  node.append(transactionNode, node.create('div', '.CL_transaction'))

  let statusNode = node.grab('#CL_statusNode')
  if (statusNode) {
    node.clear(statusNode)
    statusNode.className = 'CL_statusNode'
  } else {
    statusNode = node.create('div', '.CL_statusNode')
    node.append(transactionNode, statusNode)
  }
  node.append(statusNode,
    node.create('span', '.CL_status'),
    node.create('ul', '.CL_events')
  )

  cosmicLink.transactionNode = transactionNode
  cosmicLink.statusNode = statusNode
}
