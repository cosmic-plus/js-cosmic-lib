'use strict'
/**
 * Contains the action methods for CosmicLink.
 *
 * @private
 */
const action = exports

const StellarGuard = require('@stellarguard/sdk')

const event = require('./event')
const format = require('./format')
const parse = require('./parse')
const resolve = require('./resolve')
const status = require('./status')

const helpers = require('ticot-box/misc')

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
 * @param {...Keypair|preimage} keypairs_or_preimage One or more keypair, or a
 *     preimage
 * @returns {Promise} Signed Transaction object
 */
action.sign = async function (cosmicLink, ...keypairs_or_preimage) {
  if (cosmicLink.status) throw new Error("Can't sign invalid transaction")
  return makeSigningPromise(cosmicLink, ...keypairs_or_preimage)
}

async function makeSigningPromise (cosmicLink, ...value) {
  const transaction = await cosmicLink.getTransaction()
  let allFine = true

  if (typeof value[0] !== 'string') {
    for (let index in value) {
      const keypair = value[index]
      const publicKey = keypair.publicKey()

      if (!await cosmicLink.hasSigner(publicKey)) {
        const short = helpers.shorter(publicKey)
        status.error(cosmicLink, 'Not a legit signer: ' + short)
        allFine = false
        continue
      }

      if (hasSigned(transaction, keypair)) continue

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
  } else if (type === 'preimage') {
    try {
      transaction.signHashX(value[0])
    } catch (error) {
      console.error(error)
      const short = helpers.shorter(value[0])
      status.error(cosmicLink, 'Failed to sign with preimage: ' + short, 'throw')
    }
  }

  parse.typeTowardAll(cosmicLink, 'transaction', transaction)
  parse.makeConverter(cosmicLink, 'xdr', 'query')
  parse.makeConverter(cosmicLink, 'query', 'uri')

  cosmicLink.getSigners = helpers.delay(() => resolve.signers(cosmicLink))

  if (cosmicLink._signersNode) format.signatures(cosmicLink)

  event.callFormatHandlers(cosmicLink)

  if (!allFine) throw new Error('Some signers where invalid')
  else return transaction
}

function hasSigned (transaction, keypair) {
  const keypairHint = keypair.signatureHint().toString('base64')
  const signatures = transaction.signatures

  for (let index in signatures) {
    const hint = signatures[index].hint().toString('base64')
    if (hint === keypairHint) return true
  }

  return false
}

/**
 * Send CosmicLink transaction to `server`, or to `cosmicLink.server`. It should
 * have been signed beforehand to be validated.
 *
 * Returns a promise that resolve with horizon server response when transaction
 * is accepted, or that reject to horizon server response if transaction is
 * rejected.
 *
 * @example
 * cosmicLink.send()
 *   .then(console.log)
 *   .catch(console.error)
 *
 * @alias CosmicLink#send
 * @param {Server} [server=cosmicLink.server] A Stellar SDK [Server]{@link https://stellar.github.io/js-stellar-sdk/Server.html} object
 * @return {Promise} The server response
 */
action.send = async function (cosmicLink, server) {
  if (!server) server = cosmicLink.server
  const transaction = await cosmicLink.getTransaction()
  const account = await cosmicLink.getSourceAccount()

  if (StellarGuard.hasStellarGuard(account)) {
    if (cosmicLink.network === 'public') StellarGuard.usePublicNetwork()
    else StellarGuard.useTestNetwork()
    return StellarGuard.submitTransaction(transaction)
  } else {
    return server.submitTransaction(transaction)
  }
}
