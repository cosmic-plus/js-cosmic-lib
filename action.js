'use strict'

import * as node from './node'
import {shorter} from './helpers'

import * as status from './status'
import * as convert from './convert'
import * as resolve from './resolve'

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
  if (cosmicLink.signers && cosmicLink.signers.indexOf(publicKey) !== -1) {
    throw new Error('Transaction already signed with this key')
  }

  const signingPromise = _signingPromise(cosmicLink, keypair, publicKey)

  /// Immediatly update getters so that we get correct results even if dev
  /// doesn't call cosmicLink.sign() with await.
  cosmicLink.getTransaction = function () { return signingPromise }
  cosmicLink.getXdr = function () {
    return signingPromise.then(transaction =>
      convert.transactionToXdr(cosmicLink, transaction)
    )
  }

  await signingPromise
}

async function _signingPromise (cosmicLink, keypair, publicKey) {
  const transaction = await cosmicLink.getTransaction()
  const eventNode = status.message(cosmicLink, 'Signing...')
  _addLoadingAnim(eventNode)

  try {
    resolve.selectNetwork(cosmicLink)
    transaction.sign(keypair)
  } catch (error) {
    console.log(error)
    node.destroy(eventNode)
    status.error(cosmicLink,
      'Failed to sign with key: ' + shorter(publicKey),
      'throw'
    )
  }

  node.rewrite(eventNode, 'Signed with ' + shorter(publicKey))
  if (!cosmicLink.signers) cosmicLink.signers = []
  cosmicLink.signers.push(publicKey)

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
  if (!cosmicLink.signers) throw new Error("Can't send unsigned transaction")

  let eventNode = status.message(cosmicLink, 'Sending transaction...')
  _addLoadingAnim(eventNode)

  let answer
  try {
    answer = await server.submitTransaction(transaction)
    node.rewrite(eventNode, 'Transaction submitted')
    status.update(cosmicLink, 'Submitted')
    node.appendClass(cosmicLink.statusNode, 'CL_done')
  } catch (error) {
    console.log(error)
    node.destroy(eventNode)
    status.error(cosmicLink, 'Transaction submission failed', 'throw')
  }

  return answer
}

/**
 * Add a loading animation inside `parent`.
 *
 * @private
 * @param {HTMLElement} parent
 */
function _addLoadingAnim (parent) {
  const loadingAnim = node.create('span', '.CL_loadingAnim')
  parent.insertBefore(loadingAnim, parent.firstChild)
  loadingAnim.style.float = 'left'
}
