'use strict'
/**
 * Contains the methods to convert transactions between various formats.
 *
 * @private
 * @exports convert
 */
const convert = exports

const decode = require('./decode')
const encode = require('./encode')
const prepare = require('./prepare')
const resolve = require('./resolve')
const specs = require('./specs')
const status = require('./status')

const helpers = require('ticot-box/misc')

/** ****************************    URI -> XDR    ******************************/

/**
 * Extract the query string from `uri`.
 *
 * @param {cosmicLink} cosmicLink
 * @param {string} uri
 * @return {string} query
 */

convert.uriToQuery = function (cosmicLink, uri) {
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
convert.queryToJson = function (cosmicLink, query) {
  if (query.length < 2) status.fail(cosmicLink, 'Empty query', 'throw')

  const tdesc = {}
  const odesc = []
  let isValid = true

  let operation = query.substr(1).replace(/&.*/, '')
  const queries = query.substr(operation.length + 2).split('&')
  let mode = operation
  if (operation === 'transaction') {
    mode = 'transaction'
  } else {
    odesc.unshift({ type: mode })
    checkOperationType(cosmicLink, operation)
  }

  for (let index in queries) {
    const argument = queries[index]
    const field = argument.replace(/=.*/, '')
    let value = argument.replace(/^[^=]*=/, '')

    try {
      if (!field) continue

      if (!value && field !== 'homeDomain' && field !== 'value') {
        value = '(empty)'
        status.error(cosmicLink, 'No value for: ' + field, 'throw')
      }

      if (mode === 'transaction' && field === 'operation') {
        operation = value
        odesc.unshift({ type: value })
        checkOperationType(cosmicLink, value)
        continue
      }

      if (operation === 'transaction' && !isTransactionField(field)) {
        status.error(cosmicLink, 'Not a valid transaction field: ' + field, 'throw')
      } else if (mode === 'operation' && !isOperationField(field)) {
        status.error(cosmicLink, 'Not a valid field for this operation: ' + field, 'throw')
      }

      const decodedValue = decode.field(cosmicLink, field, value)
      if (operation === 'transaction') {
        tdesc[field] = decodedValue
      } else if (mode !== 'transaction' && isTransactionField(field)) {
        tdesc[field] = decodedValue
      } else {
        odesc[0][field] = decodedValue
      }
    } catch (error) {
      /// At this point decoding errors should already be handled.
      /// This line catch program error for debugging purpose.
      if (!cosmicLink.errors) status.error(cosmicLink, error)
      const errorObject = { error: error, value: value }
      isValid = false

      if (operation === 'transaction') {
        tdesc[field] = errorObject
      } else if (mode !== 'transaction' && isTransactionField(field)) {
        tdesc[field] = errorObject
      } else if (field === 'operation') {
        odesc[0].error = 'Unknow operation'
      } else {
        odesc[0][field] = errorObject
      }
    }
  }

  for (let index in odesc) {
    const operation = odesc[index]

    switch (operation.type) {
      case 'allowTrust':
        if (operation.authorize === undefined) operation.authorize = true
        break
      case 'createPassiveOffer':
      case 'manageOffer': {
        if (operation.buying && !operation.selling) operation.selling = XLM
        if (operation.selling && !operation.buying) operation.buying = XLM
        break
      }
      case 'manageData':
        if (!operation.value) operation.value = null
        break
      case 'pathPayment':
        if (operation.destAsset && !operation.sendAsset) operation.sendAsset = XLM
        if (operation.sendAsset && !operation.destAsset) operation.destAsset = XLM
        break
      case 'payment':
        if (!operation.asset) operation.asset = XLM
        break
    }

    const mandatoryFields = specs.operationMandatoryFields[operation.type]
    mandatoryFields.forEach(field => {
      if (operation[field] === undefined) {
        status.error(cosmicLink, 'Missing mandatory field: ' + field)
        isValid = false
      }
    })
    for (let field in operation) {
      if (!isOperationField(operation.type, field)) {
        status.error(cosmicLink, 'Invalid field: ' + field)
        isValid = false
      }
    }
  }

  tdesc.operations = odesc.reverse()
  if (!isValid) status.fail(cosmicLink, 'Invalid query')
  return convert.tdescToJson(cosmicLink, tdesc)
}

const XLM = StellarSdk.Asset.native()

/**
 * Throw an error if `type` is not a valid operation type.
 *
 * @private
 * @param {CL}
 * @param {string} type
 */
function checkOperationType (cosmicLink, type) {
  if (!isOperationTypeValid(type)) {
    status.error(cosmicLink, 'Unknow operation: ' + type, 'throw')
  }
}

/**
 * Returns `true` if `operation` is a valid operation type, `false` otherwise.
 *
 * @private
 * @param {string} string
 * @return {boolean}
 */
function isOperationTypeValid (string) {
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
function isTransactionField (string) {
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
function isOperationField (operation, string) {
  if (string === 'type') return true
  else if (
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
convert.tdescToJson = function (cosmicLink, tdesc) {
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
convert.jsonToTransaction = async function (cosmicLink, json) {
  if (cosmicLink.status) throw new Error(cosmicLink.status)
  const tdesc = convert.jsonToTdesc(cosmicLink, json)

  try {
    const builder = await makeTransactionBuilder(cosmicLink, tdesc)
    for (let index in tdesc.operations) {
      const odesc = tdesc.operations[index]
      const operation = await odescToOperation(cosmicLink, odesc)
      builder.addOperation(operation)
    }
    return builder.build()
  } catch (error) {
    if (!cosmicLink.errors) status.error(cosmicLink, error)
    if (!cosmicLink.status) status.fail(cosmicLink, "Can't build transaction", 'throw')
    else throw error
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
async function odescToOperation (cosmicLink, odesc) {
  let operation = odesc.type
  delete odesc.type

  for (let field in odesc) {
    const value = await prepare.field(cosmicLink, field, odesc[field])
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
async function makeTransactionBuilder (cosmicLink, tdesc) {
  let opts = {}
  if (tdesc.fee) opts.fee = tdesc.fee
  if (tdesc.memo) opts.memo = prepare.memo(cosmicLink, tdesc.memo)
  if (tdesc.minTime || tdesc.maxTime) {
    opts.timebounds = { minTime: 0, maxTime: 0 }
    if (tdesc.minTime) opts.timebounds.minTime = tdesc.minTime
    if (tdesc.maxTime) opts.timebounds.maxTime = tdesc.maxTime
  }

  const loadedAccount = await cosmicLink.getSourceAccount()
  if (tdesc.sequence) {
    const baseAccount = new StellarSdk.Account(loadedAccount.id, tdesc.sequence)
    baseAccount.sequence = baseAccount.sequence.sub(1)
    loadedAccount._baseAccount = baseAccount
  }
  const builder = new StellarSdk.TransactionBuilder(loadedAccount, opts)

  /// Check if memo is needed for destination account.
  for (let index in tdesc.operations) {
    const operation = tdesc.operations[index]
    if (operation.destination) {
      const account = await resolve.address(cosmicLink, operation.destination)
      if (account.memo) {
        const memoType = account.memo_type
        const memoValue = account.memo
        if (tdesc.memo && (tdesc.memo.type !== memoType || tdesc.memo.value !== memoValue)) {
          const short = helpers.shorter(operation.destination)
          status.error(cosmicLink, `Memo conflict: ${short} requires to set a memo`, 'throw')
        } else {
          tdesc.memo = { type: memoType, value: memoValue }
          builder.addMemo(new StellarSdk.Memo(memoType, memoValue))
        }
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
convert.transactionToXdr = function (cosmicLink, transaction) {
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
convert.xdrToTransaction = function (cosmicLink, xdr, options) {
  try {
    const transaction = new StellarSdk.Transaction(xdr)
    if (options.stripSignatures) transaction.signatures = []
    return transaction
  } catch (error) {
    console.error(error)
    status.fail(cosmicLink, 'Invalid XDR', 'throw')
  }
}

/**
 * Return the query equivalent to `xdr`.
 *
 * @param {CL}
 * @param {XDR} xdr Transaction envelope
 * @return {String}
 */
convert.xdrToQuery = function (cosmicLink, xdr, options = {}) {
  let query = '?xdr=' + xdr
  if (options.network) query += '&network=' + options.network
  return query
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
convert.transactionToJson = function (cosmicLink, transaction, options = {}) {
  const copy = JSON.parse(JSON.stringify(transaction))

  delete copy.tx

  if (!cosmicLink.user) cosmicLink._user = copy.source

  if (options.stripSource) {
    delete copy.source
    delete copy.signatures
    delete copy.sequence
  }
  if (options.stripSequence) {
    delete copy.sequence
    delete copy.signatures
  }
  if (options.stripSignatures) delete copy.signatures

  if (copy.signatures) {
    copy.signatures = transaction.signatures.map(entry => {
      return {
        hint: entry.hint().toString('base64'),
        signature: entry.signature().toString('base64')
      }
    })
    if (copy.signatures.length === 0) delete copy.signatures
  }

  if (copy.fee === 100 * copy.operations.length) delete copy.fee
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

  for (let index in copy.operations) {
    const operation = copy.operations[index]
    if (operation.limit === '922337203685.4775807') delete operation.limit
    if (operation.value) {
      operation.value = transaction.operations[index].value.toString()
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
        operation.signer.value = transaction.operations[index].signer.sha256Hash.toString('hex')
        delete operation.signer.sha256Hash
      } else if (operation.signer.preAuthTx) {
        operation.signer.type = 'tx'
        operation.signer.value = transaction.operations[index].signer.preAuthTx.toString('hex')
        delete operation.signer.preAuthTx
      }
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
convert.jsonToTdesc = function (cosmicLink, json) {
  return JSON.parse(json)
}

/**
 * Return the cosmic link query equivalent to `transaction descriptor`.
 *
 * @param {CL}
 * @param {Object} tdesc Transaction descriptor
 * @return {string} query
 */
convert.jsonToQuery = function (cosmicLink, json) {
  const tdesc = convert.jsonToTdesc(cosmicLink, json)

  let query = '?'
  if (tdesc.operations.length === 1) query += tdesc.operations[0].type
  else query += 'transaction'

  specs.transactionOptionalFields.forEach(field => {
    if (tdesc[field] !== undefined) {
      query += encode.field(cosmicLink, field, tdesc[field])
    }
  })

  for (let index in tdesc.operations) {
    const operation = tdesc.operations[index]
    const fields = specs.operationMandatoryFields[operation.type]
      .concat(specs.operationOptionalFields[operation.type])

    if (tdesc.operations.length > 1) query += '&operation=' + operation.type
    fields.forEach(field => {
      query += encode.field(cosmicLink, field, operation[field])
    })
  }

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
convert.queryToUri = function (cosmicLink, query) {
  return cosmicLink.page + query
}
