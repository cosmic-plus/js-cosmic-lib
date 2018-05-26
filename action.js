'use strict'

import {shorter, delay} from './helpers'

import * as status from './status'
import * as resolve from './resolve'
import * as parse from './parse'
import * as format from './format'
import * as event from './event'

/**
 * Contains the action methods for CosmicLink.
 *
 *
 * @module
 */

/**
 * Sign `cosmicLink` using secret `Keypair`.
 * Return a promise that terminate when signing is over, and that resolve to
 * the signed Transaction object.
 *
 * @param {cosmicLink} cosmicLink
 * @param {seed} seed
 * @promise Signed Transaction object
 */

export async function sign (cosmicLink, seed) {
  let keypair, publicKey
  try {
    keypair = StellarSdk.Keypair.fromSecret(seed)
    publicKey = keypair.publicKey()
  } catch (error) {
    console.log(error)
    throw new Error('Invalid secret seed')
  }

  if (cosmicLink.status) throw new Error("Can't sign invalid transaction")
  if (!await cosmicLink.hasSigner(publicKey)) {
    throw new Error('Not a legit signer: ' + shorter(publicKey))
  }
  if (await cosmicLink.hasSigned(publicKey)) {
    throw new Error('Transaction already signed with this key')
  }

  const signingPromise = _signingPromise(cosmicLink, keypair, publicKey)
  parse.typeTowardAllUsingDelayed(cosmicLink, 'transaction', () => signingPromise)
  parse.makeConverter(cosmicLink, 'xdr', 'query')
  parse.makeConverter(cosmicLink, 'query', 'uri')
  event.callFormatHandlers(cosmicLink)
  await signingPromise
}

async function _signingPromise (cosmicLink, keypair, publicKey) {
  const transaction = await cosmicLink.getTransaction()

  try {
    resolve.selectNetwork(cosmicLink)
    transaction.sign(keypair)
  } catch (error) {
    console.log(error)
    status.error(cosmicLink,
      'Failed to sign with key: ' + shorter(publicKey),
      'throw'
    )
  }

  cosmicLink.getSigners = delay(() => resolve.getSigners(cosmicLink))
  format.signers(cosmicLink)

  return transaction
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
export async function send (cosmicLink, server) {
  if (!server) server = cosmicLink.server
  const transaction = await cosmicLink.getTransaction()
  const response = server.submitTransaction(transaction)
  response.catch(console.log)
  return response
}
