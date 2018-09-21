'use strict'
/**
 * Contains the action methods for CosmicLink.
 *
 * @private
 * @exports action
 */
const action = exports

const helpers = require('@cosmic-plus/jsutils/misc')
const StellarGuard = require('@stellarguard/sdk')

const convert = require('./convert')
const config = require('./config')
const event = require('./event')
const format = require('./format')
const resolve = require('./resolve')
const status = require('./status')


/**
 * Lock a CosmicLink to a network, a primary source a sequence numbre. It is
 * required in order to generate the CosmicLink's {@link Transaction} and
 * {@link XDR} objects, to sign() and to send() the transaction.
 *
 * Note that in some cases `network`, `source` and/or `sequence` may be specified
 * into the cosmic query in which case they takes precedence.
 *
 * @alias CosmicLink#lock
 * @param {Object} options
 * @param {string} options.source An account ID or a federated address
 * @param {string} options.network Either `public`, `test` or a network passphrase
 */
action.lock = async function (cosmicLink, options = {}) {
  if (cosmicLink.status) {
    event.callFormatHandlers(cosmicLink, ['transaction', 'xdr'])
    throw new Error('Invalid transaction')
  }

  if (cosmicLink.locker) {
    throw new Error('CosmicLink is already locked.')
  }

  try {
    await applyLock(cosmicLink, options)
  } catch (error) {
    console.log(error)
    if (!cosmicLink.errors) status.error(cosmicLink, error.message)
    status.fail(cosmicLink, "Can't build transaction", 'throw')
  }

  return cosmicLink
}

async function applyLock (cosmicLink, options) {
  cosmicLink.locker = {
    source: cosmicLink.tdesc.source || options.source || config.source,
    network: cosmicLink.tdesc.network || options.network || config.network
  }

  /// Preserve the underlying tdesc object.
  cosmicLink._tdesc = Object.assign({}, cosmicLink.tdesc, cosmicLink.locker)
  delete cosmicLink._query
  delete cosmicLink._json

  if (!cosmicLink._transaction) {
    cosmicLink._transaction = await convert.tdescToTransaction(cosmicLink, cosmicLink.tdesc)
    cosmicLink.signers = await resolve.signers(cosmicLink, cosmicLink.transaction)
    delete cosmicLink._tdesc
    event.callFormatHandlers(cosmicLink)
  } else {
    cosmicLink.signers = await resolve.signers(cosmicLink, cosmicLink.transaction)
    event.callFormatHandlers(cosmicLink, ['uri', 'query', 'tdesc', 'json'])
  }
}

/**
 * Sign a CosmicLink object using `...keypairs_or_preimage`.
 * Returns a promise that resolve to the signed transaction. The CosmicLink
 * data are refreshed at promise resolution.
 *
 * @example
 * cosmicLink.sign(keypair1, keypair2)
 *  .then(function () { return cosmicLink.send() }
 *  .then(console.log)
 *  .catch(console.error)
 *
 * @alias CosmicLink#sign
 * @param {...Keypair|preimage} keypairsOrPreimage One or more keypair, or a
 *     preimage
 * @returns {Promise} Signed Transaction object
 */
action.sign = async function (cosmicLink, ...keypairsOrPreimage) {
  if (!cosmicLink.locker) throw new Error('cosmicLink is not locked.')
  resolve.useNetwork(cosmicLink)

  const transaction = cosmicLink.transaction
  let allFine = true

  if (typeof keypairsOrPreimage[0] !== 'string') {
    for (let index in keypairsOrPreimage) {
      const keypair = keypairsOrPreimage[index]
      const publicKey = keypair.publicKey()

      if (!cosmicLink.signers.hasSigner(publicKey)) {
        const short = helpers.shorter(publicKey)
        status.error(cosmicLink, 'Not a legit signer: ' + short)
        allFine = false
        continue
      }

      if (cosmicLink.signers.hasSigned(publicKey)) continue

      try {
        transaction.sign(keypair)
      } catch (error) {
        console.error(error)
        const short = helpers.shorter(publicKey)
        status.error(cosmicLink, 'Failed to sign with key: ' + short)
        allFine = false
        continue
      }
    }
  } else {
    try {
      transaction.signHashX(keypairsOrPreimage[0])
    } catch (error) {
      console.error(error)
      const short = helpers.shorter(keypairsOrPreimage[0])
      status.error(cosmicLink, 'Failed to sign with preimage: ' + short, 'throw')
    }
  }

  /// Update other formats.
  ['_query', '_xdr', '_sep7'].forEach(format => delete cosmicLink[format])
  event.callFormatHandlers(cosmicLink, ['uri', 'query', 'transaction', 'xdr', 'sep7'])

  if (cosmicLink._signersNode) {
    const signersNode = format.signatures(cosmicLink, cosmicLink.signers)
    cosmicLink.htmlNode.replaceChild(signersNode, cosmicLink._signersNode)
    cosmicLink._signersNode = signersNode
  }

  if (!allFine) throw new Error('Some signers where invalid')
  else return transaction
}

/**
 * Send CosmicLink transaction to `horizon`, or to `cosmicLink.horizon`. It should
 * have been locked and signed beforehand to be validated.
 *
 * Returns a promise that resolve to horizon server response when transaction
 * is accepted, or that reject to horizon server response if transaction is
 * rejected.
 *
 * @example
 * cosmicLink.send()
 *   .then(console.log)
 *   .catch(console.error)
 *
 * @alias CosmicLink#send
 * @param {horizon} [horizon=cosmicLink.horizon] An horizon node URL
 * @return {Promise} The server response
 */
action.send = async function (cosmicLink, horizon = cosmicLink.horizon) {
  if (!cosmicLink.locker) throw new Error('cosmicLink is not locked.')
  const server = resolve.server(cosmicLink, horizon)
  const account = await resolve.account(cosmicLink, cosmicLink.source)

  if (StellarGuard.hasStellarGuard(account)) {
    if (cosmicLink.network === 'public') StellarGuard.usePublicNetwork()
    else StellarGuard.useTestNetwork()
    return StellarGuard.submitTransaction(cosmicLink.transaction)
  } else {
    return server.submitTransaction(cosmicLink.transaction)
  }
}
