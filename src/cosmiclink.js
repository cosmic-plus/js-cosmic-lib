"use_strict"

const env = require("@cosmic-plus/jsutils/es5/env")
const misc = require("@cosmic-plus/jsutils/es5/misc")
const html = env.isBrowser && require("@cosmic-plus/domutils/es5/html")

const SideFrame = env.isBrowser && require("./helpers/side-frame")

const action = require("./action")
const config = require("./config")
const convert = require("./convert")
const format = env.isBrowser && require("./format")
const parse = require("./parse")
const resolve = require("./resolve")
const status = require("./status")

/**
 * | Formats                                     | Data                                | Actions                                        | Editor                                       | HTML elements
 * |---------------------------------------------|-------------------------------------|------------------------------------------------|----------------------------------------------|----------------------------------------
 * |-----------------------|-----------------------|-----------------------|-----------------------|-----------------------
 * | [uri]{@link CosmicLink#uri}                 |[page]{@link CosmicLink#page}        |[selectNetwork]{@link CosmicLink#selectNetwork} |[parse]{@link CosmicLink#parse}               |[htmlDescription]{@link CosmicLink#htmlDescription}
 * | [query]{@link CosmicLink#query}             |[network]{@link CosmicLink#network}  |await [lock]{@link CosmicLink#lock}             |[setTxFields]{@link CosmicLink#setTxFields}   |[htmlLink]{@link CosmicLink#htmlLink}
 * | [tdesc]{@link CosmicLink#tdesc}             |[horizon]{@link CosmicLink#horizon}  |[sign]{@link CosmicLink#sign}                   |[addOperation]{@link CosmicLink#addOperation} |
 * | [json]{@link CosmicLink#json}               |[callback]{@link CosmicLink#callback}|await [send]{@link CosmicLink#send}             |[setOperation]{@link CosmicLink#setOperation}
 * | [transaction]{@link CosmicLink#transaction} |[source]{@link CosmicLink#source}    |[open]{@link CosmicLink#open}                   |[insertOperation]{@link CosmicLink#insertOperation}
 * | [xdr]{@link CosmicLink#xdr}                 |[status]{@link CosmicLink#status}    |
 * | [sep7]{@link CosmicLink#sep7}               |[errors]{@link CosmicLink#errors}    |[verifySep7]{@link CosmicLink#verifySep7}
 * |                                             |[locker]{@link CosmicLink#locker}
 * |                                             |[cache]{@link CosmicLink#cache}
 * |                                             |[extra]{@link CosmicLink#extra}
 * -----
 *
 * The **CosmicLink** class represents Stellar
 * [transactions]{@link https://stellar.org/developers/guides/concepts/transactions.html}
 * encoded in various formats. It allows to convert between those formats, to
 * edit the underlying transaction, to build it, to sign it and to send it to
 * the blockchain.
 *
 * There are 3 main formats from which the other are derived:
 *
 * * The StellarSdk [Transaction]{@link {@link https://stellar.github.io/js-stellar-sdk/Transaction.html}} object. (**transaction**)
 * * The CosmicLink, which is a transaction encoded as a query. (**query**)
 * * The Tdesc, which is an internal JSON-compatible format in-between those two.
 *   It is the easier format to work with. (**tdesc**)
 *
 * Those formats can be derived into other related formats:
 *
 * * The XDR, which's a base64 representation of StellarSdk Transaction. (**xdr**)
 * * The Sep-0007 link, in its XDR form. (**sep7**)
 * * The CosmicLink URL/URI, which is a page plus the query. (**uri**)
 * * The Tdesc JSON, which is its stringified version. (**json**)
 *
 * A CosmicLink object can be created from any of those formats. Some of the
 * other formats are immediately available, while others may need an
 * `await cosmicLink.lock()` operation to become computable:
 *
 * * If you create a CosmicLink from an **uri**, a **query**, a **tdesc** or a
 *   **json**, only those 4 formats are available at first. Transaction, xdr &
 *   sep7 will become available after a `cosmicLink.lock()`. (**free formats**)
 * * If you create a CosmicLink from a **transaction**, an **xdr** or a **sep7**,
 *   all formats will immediately be available. (**locked formats**)
 *
 * For a better efficiency, formats are lazy-evaluated. This means that they are
 * computed once only if/when you call them:
 *
 * ```js
 * const cosmicLink = new CosmicLink(xdr, { network: 'test' })
 * console.log(cosmicLink.query)
 * ```
 *
 * The role of `cosmicLink.lock()` is centric to this class. In practice, the
 * free formats don't have to be tied to a **network**, a **source** or a
 * **sequence number**. For example, the CosmicQuery `?inflation` is a valid
 * generic transaction that can be locked to any network/source/sequence
 * combination.
 *
 * On the other hand, locked formats are always tied to a particular combination
 * of those, hence the need for a **lock** command:
 *
 * ```js
 * const cosmicLib = require('cosmic-lib')
 * cosmicLib.network = 'test'
 * cosmicLib.source = 'tips*cosmic.link'
 *
 * const cosmicLink = new cosmicLib.CosmicLink('?inflation')
 *
 * console.log(cosmicLink.tdesc.source)    // => undefined
 * console.log(cosmicLink.tdesc.network)   // => undefined
 * console.log(cosmicLink.tdesc.sequence)  // => undefined
 * console.log(cosmicLink.xdr)             // => undefined
 *
 * await cosmicLink.lock({)
 *
 * console.log(cosmicLink.tdesc.source)    // => 'GC6Z...2JVW'
 * console.log(cosmicLink.tdesc.network)   // => 'test'
 * console.log(cosmicLink.tdesc.sequence)  // => 29...3903
 * console.log(cosmicLink.xdr)             // => 'AAAA....AA=='
 * ```
 *
 * The **lock** command is asynchronous because free formats accept
 * [federated addresses]{@link https://stellar.org/developers/guides/concepts/federation.html},
 * but locked formats don't. The library automatically resolve
 * those and this is an asynchronous operation. At the same time, it downloads
 * the required data from the blockchain to handle multi-signers transactions.
 *
 * After the lock operation, all free formats are updated according to the new
 * state of the transaction. It is now possible to `cosmicLink.sign(keypair)`
 * it, and to `cosmicLink.send()` it to the blockchain.
 */
class CosmicLink {
  /**
   * Create a new CosmicLink object. **transaction** can be one of the accepted
   * format: uri, query, json, tdesc, transaction, xdr or sep7.
   *
   * @constructor
   * @param {string|Object|Transaction} transaction A transaction in one of
   *  thoses formats: uri, query, json, tdesc, transaction, xdr, sep7
   * @param {Object} options Additional options
   * @param {string} options.page The base URI to use when converting transaction
   *     to URI format.
   * @param {string} options.network For Transaction/XDR formats, the network for
   *     which it have been created
   * @param {string} options.strip Remove an element from the original
   *     XDR transaction. Valid values are `source`, `sequence` and
   *     `signatures`. Stripping out sequence means that the transaction request
   *     can get signed anytime in the future, possibly several times.
   *     Stripping out source means that it can get signed by any account.
   * @return {CosmicLink}
   */
  constructor (transaction, options) {
    initCosmicLink(this, transaction, options)
  }

  /**
   * Refer to the underlying global configuration
   * @private
   */
  get config () {
    return this.__proto__.__proto__
  }

  /**
   * Re-parse this CosmicLink. Useful in implementing transaction editors. The
   * parameters are the same than [Constructor]{@link CosmicLink#Constructor},
   * and the result is similar except that no new CosmicLink object is created.
   */
  parse (transaction, options) {
    initCosmicLink(this, transaction, options)
  }

  /// Formats
  /**
   * A CosmicLink is a URI that embed a Cosmic [Query]{@link CosmicLink#query}.
   * This format is simply the `cosmicLink.query` appended to the
   * `cosmicLink.page`
   */
  get uri () {
    if (this.query) return this.page + this.query
    else return undefined
  }

  /**
   * CosmicLink's transaction encoded in the Cosmic
   * [Query]{@link tutorial:specs_query} format. This format allows to
   * conveniently pass around Stellar transactions over any URI.
   */
  get query () {
    if (!this._query) {
      if (this.xdr) this._query = convert.xdrToQuery(this, this.xdr, this.tdesc)
      else if (this.tdesc) this._query = convert.tdescToQuery(this, this.tdesc)
      else return undefined
    }
    return this._query
  }

  /**
   * CosmicLink's transaction in Tdesc format. This is in-between an objectified
   * query representation and a simplified StellarSdk Transaction object. It has
   * been created to be convenient to understand, use and manipulate.
   *
   * If you need to read the transaction parameters, this is the format of
   * choice:
   *
   * ```js
   * console.log(cosmicLink.tdesc.network) // Does the transaction enforce a network?
   * console.log(cosmicLink.tdesc.source)  // Does the transaction enforce a source?
   * console.log(cosmicLink.tdesc.memo)    // A simplified memo object or undefined
   * console.log(cosmicLink.operations)    // Transaction operations in simplified format
   * ```
   *
   * This formats authorize [federated addresses]{@link https://stellar.org/developers/guides/concepts/federation.html}
   * everywhere StellarSdk Transaction accept public keys. Those addresses are
   * resolved when running the [lock]{@link CosmicLink#lock} method, and the
   * tdesc is replaced by a resolved one.
   *
   * Tdesc is also very convenient to edit. To keep the CosmicLink in sync, you
   * either need to [parse]{@link CosmicLink#parse} the edited tdesc, or to edit
   * it using the dedicated methods:
   *
   * * [setTxFields]{@link CosmicLink#setTxFields}: set/clear transaction fields
   * * [addOperation]{@link CosmicLink#addOperation}: add a new operation
   * * [setOperation]{@link CosmicLink#setOperation}: edit/clear an operation
   */
  get tdesc () {
    if (!this._tdesc) {
      if (this.transaction)
        this._tdesc = convert.transactionToTdesc(
          this,
          this.transaction,
          this.locker
        )
      else return undefined
    }
    return this._tdesc
  }

  /**
   * CosmicLink's transaction in JSON format. This is a stringified version of
   * [Tdesc]{@link CosmicLink#tdesc} format.
   */
  get json () {
    if (!this._json) this._json = convert.tdescToJson(this, this.tdesc)
    return this._json
  }

  /**
   * CosmicLink's transaction in StellarSdk
   * [Transaction]{@link https://stellar.github.io/js-stellar-sdk/Transaction.html}
   * format.
   *
   * If you created the CosmicLink from uri, query, tdesc or json format, a
   * [lock()]{@link CosmicLink#lock} operation is needed to make this format
   * available.
   */
  get transaction () {
    return this._transaction
  }

  /**
   * CosmicLink's transaction in
   * [XDR]{@link https://stellar.org/developers/guides/concepts/xdr.html}
   * format.
   *
   * If you created the CosmicLink from uri, query, tdesc or json format, a
   * [lock()]{@link CosmicLink#lock} operation is needed to make this format
   * available.
   */
  get xdr () {
    if (!this._xdr) {
      if (!this.transaction) return undefined
      this._xdr = convert.transactionToXdr(this, this.transaction)
    }
    return this._xdr
  }

  /**
   * CosmicLink transaction in
   * [SEP-0007]{@link https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0007.md}
   * link format. Only the XDR part of this protocol is currently supported by
   * CosmicLink, minus the signature verification.
   *
   * If you created the CosmicLink from uri, query, tdesc or json format, a
   * [lock()]{@link CosmicLink#lock} operation is needed to make this format
   * available.
   */
  get sep7 () {
    if (!this._sep7) {
      if (!this.xdr) return undefined
      this._sep7 = convert.xdrToSep7(this, this.xdr, this.tdesc)
    }
    return this._sep7
  }

  /// Data
  /**
   * The page this CosmicLink uses to construct its [URI]{@link CosmicLink#uri}.
   *
   * @var CosmicLink#page
   */

  /**
   * The source for this transaction. This can be defined either locally
   * (`cosmicLink.tdesc.source`) or globally (`cosmicLib.config.source`). The
   * local configuration takes precedence, or, in other words, the global source
   * is a fallback value in case the transaction emitter doesn't set one.
   *
   * **Note:** cosmicLink.tdesc should be edited using [setTxFields]{@link
   * CosmicLink#setTxFields}.
   */
  get source () {
    return this.tdesc && this.tdesc.source || this.config.source
  }

  /**
   * The network for this transaction. This can be defined either locally
   * (`cosmicLink.tdesc.network`) or globally (`cosmicLib.config.network`). The
   * local configuration takes precedence, or, in other words, the global
   * network is a fallback value in case the transaction emitter doesn't set
   * one.
   *
   * **Note:** cosmicLink.tdesc should be edited using [setTxFields]{@link
   * CosmicLink#setTxFields}.
   */
  get network () {
    return this.tdesc && this.tdesc.network || this.config.network
  }

  /**
   * The URL of the horizon node from which ledger data will be retrieved, and
   * to which the signed transaction will be posted if there's no
   * [callback]{@link CosmicLink#callback}.
   *
   * This can be defined either locally (`cosmicLink.tdesc.horizon`) or globally
   * (using [setupNetwork]{@link module:config.setupNetwork}). This parameter is
   * special in the sense that it's the only one for which the global
   * configuration takes precedence.
   *
   * The rationale for this behavior is that we want transaction emitter to
   * provide a fallback Horizon URL in the special case none is known for a
   * custom network, but generally speaking it won't be right to allow the
   * transaction emitter to force us to use a particular Horizon node.
   *
   * **Note:** cosmicLink.tdesc should be edited using [setTxFields]{@link
   * CosmicLink#setTxFields}.
   */
  get horizon () {
    return (
      resolve.horizon(this.config, this.network)
      || this.tdesc && this.tdesc.horizon
    )
  }

  /**
   * The URL at which the signed transaction will be posted. This can be defined
   * either locally (`cosmicLink.tdesc.callback`) or globally
   * (`cosmicLib.config.callback`). The local configuration takes precedence.
   *
   * When no callback is defined, the signed transaction is posted to
   * [Horizon]{@link CosmicLink#horizon}. This is the default behavior.
   *
   * **Note:** cosmicLink.tdesc should be edited using [setTxFields]{@link
   * CosmicLink#setTxFields}.
   */
  get callback () {
    return this.tdesc && this.tdesc.callback || this.config.callback
  }

  /// Editor
  /**
   * Add/remove transaction fields and reparse the CosmicLink. **object** should
   * follow the Tdesc format, but fields values can be written using query or
   * StellarSdk format as well.
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
   * Add a new operation to CosmicLink. **params** should follow the Tdesc format,
   * but fields values can be written using query or StellarSdk format as well.
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
   * @param {string} type The operation type.
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
   * Insert an operation at **index**. **params** should follow the
   * Tdesc format, but fields can be written using query or StellarSdk format
   * as well.
   *
   * @example
   * cosmicLink.insertOperation(0, 'changeTrust', {
   *   asset: 'CNY:admin*ripplefox'
   * })
   *
   * @param {integer} index The operation index.
   * @param {string} type  The operation type.
   * @param {params} params The operation parameters.
   * @return {CosmicLink}
   */
  insertOperation (index, type, params) {
    checkLock(this)
    if (index > !this.tdesc.operations.length) {
      throw new Error(
        `Can't insert opereration at position ${index}: there are only ${this.tdesc.operations.length} operations`
      )
    }

    const odesc = Object.assign({ type }, params)
    this.tdesc.operations.splice(index, 0, odesc)
    this.parse(this.tdesc)
    return this
  }

  /**
   * Set/remove one of the CosmicLink operations. **params** should follow the
   * Tdesc format, but fields can be written using query or StellarSdk format
   * as well. If **type** is set to `null`, the operation at **index**
   * is deleted.
   *
   * @example
   * cosmicLink.setOperation(1, 'setOptions', { homeDomain: 'example.org' })
   *
   * @example
   * cosmicLink.setOperation(2, null)
   *
   * @param {integer} index The operation index.
   * @param {string} type  The operation type.
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
   * Select the network that this CosmicLink uses.
   */
  selectNetwork () {
    return resolve.useNetwork(this)
  }
  lock (options) {
    return action.lock(this, options)
  }
  sign (...keypairs_or_preimage) {
    return action.sign(this, ...keypairs_or_preimage)
  }
  send (horizon) {
    return action.send(this, horizon)
  }

  /**
   * The HTML DOM node that displays a description of the current transaction.
   * This is a browser-only property.
   *
   * If your HTML page contains an element with `id="cosmiclink_description"`,
   * it will automatically get populated with the description of the last
   * CosmicLink created.
   */
  get htmlDescription () {
    if (!this._htmlDescription) makeHtmlDescription(this)
    return this._htmlDescription
  }

  /**
   * A link HTML Element that points to `cosmicLink.uri`
   */
  get htmlLink () {
    if (!this._htmlLink) makeHtmlLink(this)
    return this._htmlLink
  }

  /**
   * Open CosmicLink in **target**.
   *
   * - `frame` (default): Open cosmicLink in a side-frame.
   * - `tab`: Open cosmicLink in a new tab.
   * - `current`: Open cosmicLink into the current window.
   * - `sep7`: Open cosmicLink using user's SEP-0007 handler.
   *
   * @param {String} [target="frame"] Open `cosmicLink` into the requested
   *    target. Valid targets are: `frame`, `tab`, `current` and `sep7`.
   */
  open (target = "frame") {
    if (env.isNode) {
      console.error(
        "Warning: cosmicLink.open() is not supported in Node.js environment."
      )
      return
    }

    if (this.status) throw new Error(this.status)

    switch (target) {
    case "frame":
      return new SideFrame(this.uri)
    case "tab":
      window.open(this.uri)
      break
    case "current":
      location.href = this.uri
      break
    case "sep7":
      if (!this.sep7) {
        throw new Error(
          "Please use cosmicLink.lock() to build SEP-0007 link."
        )
      } else {
        location.href = this.sep7
      }
      break
    default:
      throw new Error(`Invalid cosmicLink.open() target: ${target}`)
    }
  }

  /**
   * Verify SEP-0007 signature by resolving [`cosmicLink.extra.domain`]{@link
   * CosmicLink#extra}, if any.
   * Throw an error if the signature is not valid.
   *
   * @return {undefined|String} The resolved `cosmicLink.extra.domain`, if any.
   */
  async verifySep7 () {
    if (this.extra.originDomain instanceof Promise) {
      const domain = await this.extra.originDomain
      this.extra.originDomain = domain
    } else if (this.extra.originDomain) {
      sep7Utils.verifySignature(this, this.extra.originDomain)
    }
    return this.extra.originDomain
  }

  /// Backward compatibility (2018-09 -> 2019-03).
  get server () {
    return resolve.server(this)
  }

  get htmlNode () {
    misc.deprecated(
      "2019-03",
      "cosmicLink.htmlNode",
      "cosmicLink.htmlDescription"
    )
    return this.htmlDescription
  }
  get transactionNode () {
    return html.grab(".cosmiclib_transactionNode", this.htmlDescription)
  }
  get statusNode () {
    return html.grab(".cosmiclib_statusNode", this.htmlDescription)
  }
  get signersNode () {
    return html.grab(".cosmiclib_signersNode", this.htmlDescription)
  }

  hasSigned (accountId) {
    misc.deprecated(
      "2019-03",
      "cosmicLink.hasSigned",
      "cosmicLink.transaction.hasSigned"
    )
    return this.transaction.hasSigned(accountId)
  }
  hasSigner (accountId) {
    misc.deprecated(
      "2019-03",
      "cosmicLink.hasSigner",
      "cosmicLink.transaction.hasSigner"
    )
    return this.transaction.hasSigner(accountId)
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
  /**
   * The status of a CosmicLink. It becomes non-null in case of failure.
   * @var CosmicLink#status
   */
  /**
   * By default `false`, or an *Array* of errors.
   * @var CosmicLink#errors
   */
  status.init(cosmicLink)

  /**
   * The CosmicLink cache contains the resolved federations addresses and the
   * accounts object. Using the same set of data for all the CosmicLink related
   * computations ensure consistent results.
   *
   * @var CosmicLink#cache
   */
  cosmicLink.cache = { destination: {}, account: {} }

  /**
   * After parsing a SEP-0007 link, `cosmicLink.extra` contains SEP-0007
   * specific information:
   *
   * - `cosmicLink.extra.type` indicates the operation encoded into the SEP-0007
   *   link (either `tx` or `pay`).
   * - `cosmicLink.extra.originDomain` is a _Promise_ that resolves to the
   *   origin_domain parameter when the link signature is valid. It rejects an
   *   error when the signature check fails. This property is `undefined` when
   *   the link has no origin_domain.
   * - `cosmicLink.extra.signature` contains the link signature, if any.
   * - `cosmicLink.extra.pubkey` contains the tx operation `pubkey`, if any.
   * - `cosmicLink.extra.msg` contains the parsed `msg`, if any. This is
   *   provided for compatibility purpose only. Displaying messages from
   *   untrusted sources into trusted interfaces opens hard to mitigate attack
   *   vectors & is discouraged.
   *
   * @var CosmicLink#extra
   */
  cosmicLink.extra = {}

  parse.dispatch(cosmicLink, transaction, options)

  if (env.isBrowser) {
    makeHtmlLink(cosmicLink)
    if (!cosmicLink._htmlDescription) {
      /// #cosmiclib_htmlNode: Backward compatibility (2018-09 -> 2019-03).
      cosmicLink._htmlDescription =
        html.grab("#cosmiclink_description") || html.grab("#CL_htmlNode")
    }
    if (cosmicLink._htmlDescription) {
      if (cosmicLink.htmlDescription.id === "#CL_htmlNode") {
        misc.deprecated(
          "2019-03",
          "id=\"#CL_htmlNode\"",
          "id=\"cosmiclink_description\""
        )
      }
      makeHtmlDescription(cosmicLink)
    }
  }
}
const formatsFields = ["_query", "_tdesc", "_json", "_transaction", "_xdr"]

/**
 * Initialize CosmicLink html nodes.
 *
 * @private
 */
function makeHtmlDescription (cosmicLink) {
  if (env.isNode) return
  let htmlDescription = cosmicLink._htmlDescription

  if (htmlDescription) {
    html.clear(htmlDescription)
    htmlDescription.className = "cosmiclink_description"
  } else {
    htmlDescription = html.create("div", ".cosmiclink_description")
    cosmicLink._htmlDescription = htmlDescription
  }

  cosmicLink._transactionNode = format.tdesc(cosmicLink, cosmicLink.tdesc)
  cosmicLink._statusNode = status.makeHtmlNode(cosmicLink)
  cosmicLink._signersNode = html.create("div", ".cosmiclib_signersNode")

  html.append(
    htmlDescription,
    cosmicLink._transactionNode,
    cosmicLink._statusNode,
    cosmicLink._signersNode
  )
}

/**
 * Make the HTML link.
 * @private
 */
function makeHtmlLink (cosmicLink) {
  if (env.isNode) return

  const htmlLink = html.grab("#cosmiclink") || html.create("a")
  htmlLink.className = ".cosmiclink"
  htmlLink.href = cosmicLink.page
  htmlLink.onclick = () => htmlLink.href = cosmicLink.uri
  if (!htmlLink.title) htmlLink.title = "Sign transaction"
  if (!htmlLink.textContent) htmlLink.textContent = "CosmicLink"

  cosmicLink._htmlLink = htmlLink
  return htmlLink
}

/**
 * Throw an error if CosmicLink is locked.
 * @private
 */
function checkLock (cosmicLink) {
  if (cosmicLink.locker) throw new Error("Cosmic link is locked.")
}

CosmicLink.prototype.__proto__ = config
module.exports = CosmicLink
