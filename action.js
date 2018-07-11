'use strict'
/**
 * Contains the action methods for CosmicLink.
 *
 * @exports action
 */
const action = exports

const helpers = require('./helpers')
const status = require('./status')
const resolve = require('./resolve')
const parse = require('./parse')
const format = require('./format')
const event = require('./event')

/**
 * Sign `cosmicLink` using `keypairs_or_preimage`.
 * Return a promise that resolve to the signed transaction. The cosmic link data
 * is updated as well, so you don't necessarely need to await or make use of
 * this returned promise.
 *
 * @param {cosmicLink} cosmicLink
 * @param {...Keypair|preimage} keypairs_or_preimage One or more keypair, or a
 *     preimage
 * @promise Signed Transaction object
 */

action.sign = async function (cosmicLink, ...keypairs_or_preimage) {
  if (cosmicLink.status) throw new Error("Can't sign invalid transaction")

  let type, value

  if (keypairs_or_preimage.length === 1 &&
      typeof keypairs_or_preimage[0] === 'string'
  ) {
    type = 'preimage'
    value = keypairs_or_preimage
  } else {
    type = 'keypair'
    value = keypairs_or_preimage
    value.forEach(entry => {
      if (!entry.canSign) throw new Error('Invalid keypair')
    })
  }

  const signingPromise = makeSigningPromise(cosmicLink, type, ...value)
  parse.typeTowardAllUsingDelayed(cosmicLink, 'transaction', () => signingPromise)
  parse.makeConverter(cosmicLink, 'xdr', 'query')
  parse.makeConverter(cosmicLink, 'query', 'uri')
  event.callFormatHandlers(cosmicLink)
  await signingPromise
}

async function makeSigningPromise (cosmicLink, type, ...value) {
  const transaction = await cosmicLink.getTransaction()

  if (type === 'keypair') {
    for (let index in value) {
      const keypair = value[index]
      const publicKey = keypair.publicKey()

      if (!await cosmicLink.hasSigner(publicKey)) {
        const short = helpers.shorter(publicKey)
        status.error(cosmicLink, 'Not a legit signer: ' + short)
        continue
      }

      if(hasSigned(transaction, keypair)) continue

      try {
        transaction.sign(keypair)
      } catch (error) {
        console.log(error)
        const short = helpers.shorter(publicKey)
        status.error(cosmicLink, 'Failed to sign with key: ' + short)
        return transaction
      }
    }
  } else if (type === 'preimage') {
    try {
      transaction.signHashX(value[0])
    } catch (error) {
      console.log(error)
      const short = helpers.shorter(value[0])
      status.error(cosmicLink, 'Failed to sign with preimage: ' + short)
      return transaction
    }
  }

  cosmicLink.getSigners = helpers.delay(() => resolve.signers(cosmicLink))
  format.signatures(cosmicLink)
  return transaction
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
 * Send `cosmicLink`'s transaction to `server`. It should have been signed
 * beforehand.
 * Return a promise that terminate when submission is over.
 *
 * @param {CL}
 * @param {Server} [server=cosmicLink.server] Stellar SDK Server object
 * @return {Object} The server response
 */
action.send = async function (cosmicLink, server) {
  if (!server) server = cosmicLink.server
  const transaction = await cosmicLink.getTransaction()
  const response = server.submitTransaction(transaction)
  response.catch(console.log)
  return response
}
