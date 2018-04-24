'use strict'

import * as specs from './specs'
import * as status from './status'
import * as decode from './decode'
import * as resolve from './resolve'
import * as prepare from './prepare'
import * as encode from './encode'
/**
 * Contains the methods to convert transactions between various formats.
 *
 * @module
 */

/** ****************************    URI -> XDR    ******************************/

/**
 * Extract the query string from `uri`.
 *
 * @param {cosmicLink} cosmicLink
 * @param {string} uri
 * @return {string} query
 */

export function uriToQuery (cosmicLink, uri) {
  if (!uri.match(/\?/)) return null
  const query = uri.replace(/^[^?]*/, '')
  return query
}

/**
 * Build a `transaction descriptor` object from a cosmic link `query`.
 *
 * @param {cosmicLink} cosmicLink
 * @param {string} query
 * @return {Object} tdesc
 */
export function queryToJson (cosmicLink, query) {
  if (query.length < 2) status.fail(cosmicLink, 'Empty query', 'throw')

  /// Transaction descriptor.
  const tdesc = {}
  /// Operation descriptor.
  const odesc = {}
  const operation = query.substr(1).replace(/&.*/, '')
  let isValid = true

  if (!_isOperationTypeValid(operation)) {
    status.error(cosmicLink, 'Unknow operation: ' + operation)
    status.fail(cosmicLink, 'Invalid query', 'throw')
  }

  const queries = query.substr(operation.length + 2).split('&')
  for (let index in queries) {
    const argument = queries[index]
    let temp = argument.split('=')
    let field = temp[0], value = temp[1]

    try {
      if (!field) continue
      if (!value && field !== 'homeDomain') {
        value = '(empty)'
        status.error(cosmicLink, 'No value for ' + field, 'throw')
      }

      let decodedValue = decode.fieldValue(cosmicLink, field, value)
      if (_isTransactionField(field)) tdesc[field] = decodedValue
      else odesc[field] = decodedValue
    } catch (error) {
      /// At this point decoding errors should already be handled.
      /// This line catch program error for debugging purpose.
      if (!cosmicLink.errors) status.error(cosmicLink, error)
      isValid = false
      const errorObject = { error: error, value: value }
      if (_isTransactionField(field)) tdesc[field] = errorObject
      else odesc[field] = errorObject
    }
  }

  const native = StellarSdk.Asset.native()
  switch (operation) {
    case 'allowTrust':
      if (odesc.authorize === undefined) odesc.authorize = true
      break
    case 'createPassiveOffer':
    case 'manageOffer': {
      if (odesc.buying && !odesc.selling) odesc.selling = native
      if (odesc.selling && !odesc.buying) odesc.buying = native
      break
    }
    case 'manageData':
      if (!odesc.value) odesc.value = null
      break
    case 'pathPayment':
      if (odesc.destAsset && !odesc.sendAsset) odesc.sendAsset = native
      if (odesc.sendAsset && !odesc.destAsset) odesc.destAsset = native
      break
    case 'payment':
      if (!odesc.asset) odesc.asset = native
      break
  }

  const mandatoryFields = specs.operationMandatoryFields[operation]
  mandatoryFields.forEach(field => {
    if (odesc[field] === undefined) {
      isValid = false
      status.error(cosmicLink, 'Missing mandatory field: ' + field)
    }
  })
  for (let field in odesc) {
    if (!_isOperationField(operation, field)) {
      isValid = false
      status.error(cosmicLink, 'Invalid field: ' + field)
    }
  }

  tdesc.operations = [ odesc ]
  odesc.type = operation
  if (!isValid) status.fail(cosmicLink, 'Invalid query')
  return tdescToJson(cosmicLink, tdesc)
}

/**
 * Returns `true` if `operation` is a valid operation type, `false` otherwise.
 *
 * @private
 * @param {string} string
 * @return {boolean}
 */
function _isOperationTypeValid (string) {
  if (specs.operationMandatoryFields[string]) return true
  else return false
}

/**
 * Returns `true` if `string` is a valid transaction field, `false` otherwise.
 *
 * @private
 * @param {string} string
 * @return {boolean}
 */
function _isTransactionField (string) {
  if (specs.transactionOptionalFields.indexOf(string) !== -1) return true
  else return false
}

/**
 * Returns `true` if `string` is a valid field for `operation`, `false`
 * otherwise.
 *
 * @private
 * @param {string} operation
 * @param {string} string
 * @return {boolean}
 */
function _isOperationField (operation, string) {
  if (
    specs.operationMandatoryFields[operation].indexOf(string) === -1 &&
    specs.operationOptionalFields[operation].indexOf(string) === -1
  ) return false
  else return true
}

/**
 * Returns the JSON of cosmic link `transaction descriptor`.
 *
 * @param {cosmicLink} cosmicLink
 * @param {Object} tdesc transaction descriptor
 * @return {string} transaction descriptor JSON
 */
export function tdescToJson (cosmicLink, tdesc) {
  return JSON.stringify(tdesc, null, 2)
}

/**
 * Returns the Stellar `transaction` object for `cosmicLink`'s
 * `transaction descriptor`.
 *
 * @param {cosmicLink} cosmicLink
 * @param {Object} tdesc transaction descriptor
 * @return {Transaction}
 */
export async function jsonToTransaction (cosmicLink, json) {
  if (cosmicLink.errors) {
    throw new Error("Can't build transaction from invalid cosmic link.")
  }

  const tdesc = jsonToTdesc(cosmicLink, json)
  if (cosmicLink.status) throw cosmicLink.status

  if (!tdesc.source) {
    if (cosmicLink.user) tdesc.source = cosmicLink.user
    else status.fail(cosmicLink, 'Missing user/source account', 'throw')
  }

  if (!cosmicLink.server) status.fail(cosmicLink, 'No server defined', 'throw')

  try {
    resolve.selectNetwork(cosmicLink)
    const builder = await _makeTransactionBuilder(cosmicLink, tdesc)
    const operation = await _odescToOperation(cosmicLink, tdesc.operations[0])
    builder.addOperation(operation)
    return builder.build()
  } catch (error) {
    if (!cosmicLink.errors) status.error(cosmicLink, error)
    if (!cosmicLink.status) status.fail(cosmicLink, "Can't build transaction", 'throw')
  }
}

/**
 * Returns an Operation object equivalent to cosmic link `operation descriptor`.
 *
 * @private
 * @param {CL}
 * @param {Object} odesc Operation descriptor
 * @return {Operation}
 */
async function _odescToOperation (cosmicLink, odesc) {
  let operation = odesc.type
  delete odesc.type

  for (let field in odesc) {
    const value = await prepare.fieldValue(cosmicLink, field, odesc[field])
    odesc[field] = value
  }

  return StellarSdk.Operation[operation](odesc)
}

/**
 * Returns a TransactionBuilder for `transaction descriptor`.
 *
 * @private
 * @param {CL}
 * @param {Object} tdesc Transaction descriptor
 * @return {TransactionBuilder}
 */
async function _makeTransactionBuilder (cosmicLink, tdesc) {
  let opts = {}
  if (tdesc.fee) opts.fee = tdesc.fee
  if (tdesc.memo) opts.memo = prepare.memo(cosmicLink, tdesc.memo)
  if (tdesc.minTime || tdesc.maxTime) {
    opts.timebounds = { minTime: 0, maxTime: 0 }
    if (tdesc.minTime) opts.timebounds.minTime = tdesc.minTime
    if (tdesc.maxTime) opts.timebounds.maxTime = tdesc.maxTime
  }

  const address = await prepare.address(cosmicLink, tdesc.source)
  const loadedAccount = await cosmicLink.server.loadAccount(address)
  const builder = new StellarSdk.TransactionBuilder(loadedAccount, opts)

  /// Check if memo is needed for destination account.
  const operation = tdesc.operations[0]
  if (operation.destination) {
    const account = await resolve.address(cosmicLink, operation.destination)
    if (account.memo) {
      const memoType = account.memo_type
      const memoValue = account.memo
      if (tdesc.memo && (tdesc.memo.type !== memoType || tdesc.memo.value !== memoValue)) {
        status.error(cosmicLink, 'Memo conflict', 'throw')
      } else {
        builder.addMemo(new StellarSdk.Memo(memoType, memoValue))
      }
    }
  }

  return builder
}

/**
 * Return the XDR of `transaction`.
 *
 * @param {CL}
 * @param {Transaction} transaction
 * @return {XDR}
 */
export function transactionToXdr (cosmicLink, transaction) {
  return transaction.toEnvelope().toXDR('base64')
}

/** ****************************    XDR -> URI    ******************************/

/**
 * Return the Transaction object equivalent to `xdr`.
 *
 * @param {CL}
 * @param {XDR} xdr
 * @return {Transaction}
 */
export function xdrToTransaction (cosmicLink, xdr) {
  return new StellarSdk.Transaction(xdr)
}

/**
 * Return the `transaction descriptor` JSON equivalent to Stellar `Transaction`
 * object.
 *
 * Set options.stripSource to true for a transaction that is account-agnostic,
 * like an exchange operation for example. Ignore it for a transaction that
 * is required to be performed from the source account defined in 'XDR'
 * (example: subscription monthly fee).
 *
 * You may set options.network to the desired network.
 *
 * @param {CL}
 * @param {Transaction} transaction
 * @param {Object} options
 * @return {JSON} transaction descriptor JSON
 */
export function transactionToJson (cosmicLink, transaction, options = {}) {
  const copy = JSON.parse(JSON.stringify(transaction))

  if (copy.operations.length > 1) {
    status.error(cosmicLink, "Can't parse multi-operation transactions yet.")
    status.fail(cosmicLink, 'Unhandled transaction', 'throw')
  }
  if (copy.signatures.length > 0) {
    status.error(cosmicLink, "Can't handle multi-signature yet.")
    status.fail(cosmicLink, 'Unhandled transaction', 'throw')
  }

  delete copy.tx
  delete copy.sequence
  delete copy.signatures

  if (!cosmicLink.user) cosmicLink.user = copy.source
  if (options.stripSource) delete copy.source

  if (copy.fee === 100) delete copy.fee
  if (copy._memo._switch.name !== 'memoNone') {
    copy.memo = {}
    copy.memo.type = copy._memo._arm
    if (copy.memo.type === 'hash' || copy.memo.type === 'retHash') {
      copy.memo.value = transaction._memo._value.toString('hex')
      if (copy.memo.type === 'retHash') copy.memo.type = 'return'
    } else {
      copy.memo.value = transaction._memo._value.toString()
    }
  }
  delete copy._memo

  if (copy.timeBounds) {
    if (copy.timeBounds.minTime && copy.timeBounds.minTime !== '0') {
      copy.minTime = copy.timeBounds.minTime
    }
    if (copy.timeBounds.maxTime && copy.timeBounds.maxTime !== '0') {
      copy.maxTime = copy.timeBounds.maxTime
    }
    delete copy.timeBounds
  }

  var operation = copy.operations[0]
  if (operation.limit === '922337203685.4775807') delete operation.limit
  if (operation.value) {
    operation.value = transaction.operations[0].value.toString()
  }
  if (operation.offerId === '0') delete operation.offerId
  if (operation.path && operation.path.length === 0) delete operation.path
  if (operation.line) {
    operation.asset = operation.line
    delete operation.line
  }
  if (operation.signer) {
    if (operation.signer.ed25519PublicKey) {
      operation.signer.type = 'key'
      operation.signer.value = operation.signer.ed25519PublicKey
      delete operation.signer.ed25519PublicKey
    } else if (operation.signer.sha256Hash) {
      operation.signer.type = 'hash'
      operation.signer.value = transaction.operations[0].signer.sha256Hash.toString('hex')
      delete operation.signer.sha256Hash
    } else if (operation.signer.preAuthTx) {
      operation.signer.type = 'tx'
      operation.signer.value = transaction.operations[0].signer.preAuthTx.toString('hex')
      delete operation.signer.preAuthTx
    }
  }

  if (options.network !== undefined) copy.network = options.network

  return JSON.stringify(copy, null, 2)
}

/**
 * Parse `transaction descriptor` from `JSON`.
 *
 * @param {CL}
 * @param {JSON} JSON transaction descriptior
 * @return {Object} transaction descriptor
 */
export function jsonToTdesc (cosmicLink, json) {
  return JSON.parse(json)
}

/**
 * Return the cosmic link query equivalent to `transaction descriptor`.
 *
 * @param {CL}
 * @param {Object} tdesc Transaction descriptor
 * @return {string} query
 */
export function jsonToQuery (cosmicLink, json) {
  const tdesc = jsonToTdesc(cosmicLink, json)
  const operation = tdesc.operations[0].type
  let query = '?' + operation

  specs.transactionOptionalFields.forEach(field => {
    if (tdesc[field] !== undefined) {
      query = query + encode.field(cosmicLink, field, tdesc[field])
    }
  })

  const odesc = tdesc.operations[0]
  const operationFields = specs.operationMandatoryFields[operation]
    .concat(specs.operationOptionalFields[operation])

  operationFields.forEach(field => {
    if (odesc[field] !== undefined) {
      query = query + encode.field(cosmicLink, field, odesc[field])
    }
  })
  return query
}

/**
 * Return a complete cosmic link URI made of `query` and `cosmicLink.page`.
 * Use `https://cosmic.link/` if `cosmicLink.page` is undefined
 *
 * @param {CL}
 * @param {string} query
 * @param {string} cosmic link URI
 */
export function queryToUri (cosmicLink, query) {
  return cosmicLink.page + query
}
