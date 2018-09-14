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
 * @param {string} uri
 * @return {string} query
 */

convert.uriToQuery = function (conf, uri) {
  if (!uri.match(/\?/)) return null
  const query = uri.replace(/^[^?]*/, '')
  return query
}

/**
 * Build a `transaction descriptor` object from a cosmic link `query`.
 *
 * @param {string} query
 * @return {Object} tdesc
 */
convert.queryToTdesc = function (conf, query) {
  if (!query.length) return status.fail('No query')

  const odesc = []
  const tdesc = { operations: odesc }
  if (query === '?') return tdesc

  let operation = query.substr(1).replace(/&.*/, '')
  const queries = query.substr(operation.length + 2).split('&')
  let mode = operation
  if (operation === 'transaction') {
    mode = 'transaction'
  } else {
    odesc.unshift({ type: mode })
    try {
      checkOperationType(conf, operation)
    } catch (error) {
      odesc[0].error = 'Unknow operation'
    }
  }

  for (let index in queries) {
    const argument = queries[index]
    const field = argument.replace(/=.*/, '')
    let value = argument.replace(/^[^=]*=/, '')

    try {
      if (!field) continue

      if (!value && field !== 'homeDomain' && field !== 'value') {
        value = '(empty)'
        status.error(conf, 'No value for: ' + field, 'throw')
      }

      if (mode === 'transaction' && field === 'operation') {
        operation = value
        odesc.unshift({ type: value })
        checkOperationType(conf, value)
        continue
      }

      if (operation === 'transaction' && !isTransactionField(field)) {
        status.error(conf, 'Not a valid transaction field: ' + field, 'throw')
      } else if (mode === 'operation' && !isOperationField(field)) {
        status.error(conf, 'Not a valid field for this operation: ' + field, 'throw')
      }

      const decodedValue = decode.field(conf, field, value)
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
      if (!conf.errors) status.error(conf, error)
      const errorObject = { error: error, value: value }

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
    if (operation.error) continue

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
        status.error(conf, 'Missing mandatory field: ' + field)
      }
    })
    for (let field in operation) {
      if (!isOperationField(operation.type, field)) {
        status.error(conf, 'Invalid field: ' + field)
      }
    }
  }

  tdesc.operations = odesc.reverse()
  if (conf.errors) status.fail(conf, 'Invalid query')
  return tdesc
}

const XLM = StellarSdk.Asset.native()

/**
 * Throw an error if `type` is not a valid operation type.
 */
function checkOperationType (conf, type) {
  if (!isOperationTypeValid(type)) {
    status.error(conf, 'Unknow operation: ' + type, 'throw')
  }
}

/**
 * Returns `true` if `operation` is a valid operation type, `false` otherwise.
 */
function isOperationTypeValid (string) {
  if (specs.operationMandatoryFields[string]) return true
  else return false
}

/**
 * Returns `true` if `string` is a valid transaction field, `false` otherwise.
 */
function isTransactionField (string) {
  if (specs.transactionOptionalFields.indexOf(string) !== -1) return true
  else return false
}

/**
 * Returns `true` if `string` is a valid field for `operation`, `false`
 * otherwise.
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
 * @param {Object} tdesc transaction descriptor
 * @return {string} transaction descriptor JSON
 */
convert.tdescToJson = function (conf, tdesc) {
  return JSON.stringify(tdesc, null, 2)
}

/**
 * Returns the Stellar `transaction` corresponding to `tdesc`.
 *
 * @param {Object} json Json CosmicLink format.
 * @return {Transaction}
 */
convert.tdescToTransaction = async function (conf, tdesc) {
  if (conf.status) throw new Error(conf.status)

  try {
    const builder = await makeTransactionBuilder(conf, tdesc)
    for (let index in tdesc.operations) {
      const odesc = tdesc.operations[index]
      const operation = await odescToOperation(conf, odesc)
      builder.addOperation(operation)
    }
    return builder.build()
  } catch (error) {
    console.error(error)
    if (!conf.errors) status.error(conf, error)
    if (!conf.status) status.fail(conf, "Can't build transaction", 'throw')
    else throw error
  }
}

/**
 * Returns an Operation object equivalent to cosmic link `operation descriptor`.
 */
async function odescToOperation (conf, odesc) {
  let operation = odesc.type
  delete odesc.type

  for (let field in odesc) {
    const value = await prepare.field(conf, field, odesc[field])
    odesc[field] = value
  }

  return StellarSdk.Operation[operation](odesc)
}

/**
 * Returns a TransactionBuilder for `transaction descriptor`.
 */
async function makeTransactionBuilder (conf, tdesc) {
  let txOpts = {}
  if (tdesc.fee) txOpts.fee = tdesc.fee
  if (tdesc.memo) txOpts.memo = prepare.memo(conf, tdesc.memo)
  if (tdesc.minTime || tdesc.maxTime) {
    txOpts.timebounds = { minTime: 0, maxTime: 0 }
    if (tdesc.minTime) txOpts.timebounds.minTime = tdesc.minTime
    if (tdesc.maxTime) txOpts.timebounds.maxTime = tdesc.maxTime
  }

  const sourceAccount = await getMainSourceAccount(conf, tdesc)
  const builder = new StellarSdk.TransactionBuilder(sourceAccount, txOpts)

  /// Check if memo is needed for destination account.
  for (let index in tdesc.operations) {
    const operation = tdesc.operations[index]
    if (operation.destination) {
      const destination = await resolve.address(conf, operation.destination)
      if (destination.memo) {
        const memoType = destination.memo_type
        const memoValue = destination.memo
        if (tdesc.memo && (tdesc.memo.type !== memoType || tdesc.memo.value !== memoValue)) {
          const short = helpers.shorter(operation.destination)
          status.error(conf, `Memo conflict: ${short} requires to set a memo`, 'throw')
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
 * Fetch the main source account for `tdesc` or return a neutral account.
 */
async function getMainSourceAccount (conf, tdesc) {
  const source = tdesc.source || conf.source
  if (!source) {
    return new StellarSdk.Account(specs.neutralAccountId, '0')
  } else {
    const account = await resolve.account(conf, source)
    if (tdesc.sequence) {
      const baseAccount = new StellarSdk.Account(source, tdesc.sequence)
      baseAccount.sequence = baseAccount.sequence.sub(1)
      account._baseAccount = baseAccount
    }
    return account
  }
}

/**
 * Return the XDR of `transaction`.
 *
 * @param {Transaction} transaction
 * @return {XDR}
 */
convert.transactionToXdr = function (conf, transaction) {
  return transaction.toEnvelope().toXDR('base64')
}

/**
 * Returns the SEP-0007 representation for `xdr`.
 *
 * @param {XDR} xdr Transaction envelope XDR.
 * @return {string} SEP-0007 encoded url.
 */
convert.xdrToSep7 = function (conf, xdr) {
  let sep7 = 'web+stellar:tx?xdr='
  sep7 += encodeURIComponent(xdr)
  const passphrase = resolve.networkPassphrase(conf)
  if (passphrase !== StellarSdk.Networks.PUBLIC) {
    sep7 += '&network_passphrase=' + encodeURIComponent(passphrase)
  }
  return sep7
}

/** ****************************    XDR -> URI    ******************************/

/**
 * Return the Transaction object equivalent to `xdr`.
 *
 * @param {XDR} xdr
 * @return {Transaction}
 */
convert.xdrToTransaction = function (conf, xdr, options = {}) {
  try {
    const transaction = new StellarSdk.Transaction(xdr)
    if (options.stripSignatures) transaction.signatures = []
    return transaction
  } catch (error) {
    console.error(error)
    status.fail(conf, 'Invalid XDR', 'throw')
  }
}

/**
 * Return the query equivalent to `xdr`.
 *
 * @param {XDR} xdr Transaction envelope
 * @return {String}
 */
convert.xdrToQuery = function (conf, xdr, options = {}) {
  let query = '?xdr=' + xdr
  if (options.network) query += '&network=' + options.network
  return query
}

/**
 * Return the `transaction descriptor` equivalent to Stellar `Transaction`
 * object.
 *
 * Set options.stripSource to true for a transaction that is account-agnostic,
 * like an exchange operation for example. Ignore it for a transaction that
 * is required to be performed from the source account defined in 'XDR'
 * (example: subscription monthly fee).
 *
 * You may set options.network to the desired network.
 *
 * @param {Transaction} transaction
 * @param {Object} options
 * @return {tdesc} transaction descriptor
 */
convert.transactionToTdesc = function (conf, transaction, options = {}) {
  const copy = JSON.parse(JSON.stringify(transaction))
  delete copy.tx

  if (copy.source === specs.neutralAccountId) options.stripSource = true
  if (copy.sequence === '0') options.stripSequence = true

  if (options.stripSource) {
    delete copy.source
    delete copy.sequence
  }
  if (options.stripSequence) delete copy.sequence
  delete copy.signatures

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

  return copy
}

/**
 * Parse `transaction descriptor` from `JSON`.
 *
 * @param {JSON} JSON transaction descriptior
 * @return {Object} transaction descriptor
 */
convert.jsonToTdesc = function (conf, json) {
  return JSON.parse(json)
}

/**
 * Return the cosmic link query equivalent to `transaction descriptor`.
 *
 * @param {Object} tdesc Transaction descriptor
 * @return {string} query
 */
convert.tdescToQuery = function (conf, tdesc) {
  let query = '?'
  if (tdesc.operations.length === 1) query += tdesc.operations[0].type
  else query += 'transaction'

  specs.transactionOptionalFields.forEach(field => {
    if (tdesc[field] !== undefined) {
      query += encode.field(conf, field, tdesc[field])
    }
  })

  for (let index in tdesc.operations) {
    const operation = tdesc.operations[index]
    const fields = specs.operationMandatoryFields[operation.type]
      .concat(specs.operationOptionalFields[operation.type])

    if (tdesc.operations.length > 1) query += '&operation=' + operation.type
    fields.forEach(field => {
      query += encode.field(conf, field, operation[field])
    })
  }

  return query
}

/**
 * Returns a complete cosmic link URI made of `query` and `conf.page`.
 * Use `https://cosmic.link/` if `conf.page` is undefined
 *
 * @param {string} query
 * @param {string} cosmic link URI
 */
convert.queryToUri = function (conf, query) {
  const page = conf.page || 'https://cosmic.link'
  return page + query
}
