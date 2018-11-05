"use strict"
/**
 * Contains the action methods for CosmicLink.
 *
 * @private
 * @exports action
 */
const action = exports

const axios = require("@cosmic-plus/base/axios")
const env = require("@cosmic-plus/jsutils/env")
const helpers = require("@cosmic-plus/jsutils/misc")

const convert = require("./convert")
const config = require("./config")
const format = env.isBrowser && require("./format")
const resolve = require("./resolve")
const signersUtils = require("./signers-utils")
const status = require("./status")

/**
 * Lock a CosmicLink to a network/source pair. The actual values for this pair
 * are defined by the transaction itself, or at parsing time for Transaction &
 * XDR formats, or by this lock method, or by the global configuration.
 *
 * Locking is an asynchronous operation and resolves the transaction's federated
 * addresses if any. It also fetchs required accounts data to handle the
 * transaction signers properly. For this reason, it is mandatory before
 * signing and sending a transaction to the blockchain.
 *
 * @example
 * const cosmicLink = new CosmicLink({ memo: 'Demo', network: 'test' })
 * await cosmicLink.lock({ network: 'public' })
 * console.log(cosmicLink.network)   // => 'test'
 *
 * @alias CosmicLink#lock
 * @async
 * @param {Object} [options]
 * @param {string} options.network The fallback network in case transaction doesn't provides one.
 * @param {string} options.source The fallback address in case transaction doesn't provides one.
 */
action.lock = async function (cosmicLink, options = {}) {
  if (cosmicLink.status) throw new Error(cosmicLink.status)
  if (cosmicLink.locker) throw new Error("CosmicLink is already locked.")

  try {
    await applyLock(cosmicLink, options)
  } catch (error) {
    if (!cosmicLink.errors) {
      console.error(error)
      status.error(cosmicLink, error.message)
    }
    status.fail(cosmicLink, "Transaction build failed", "throw")
  }

  updateSignersNode(cosmicLink)

  return cosmicLink
}

async function applyLock (cosmicLink, options) {
  /**
   * The locker property tells that a CosmicLink have been locked, and exposes
   * the network & source values to which it have been locked.
   *
   * @alias CosmicLink#locker
   */
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
    delete cosmicLink._tdesc
  }

  delete cosmicLink._transaction._cosmicplus
  await signersUtils.extends(cosmicLink, cosmicLink._transaction)
}

/**
 * Sign CosmicLink's Transaction with **keypairs_or_preimage** and update the
 * other formats accordingly. Only legit signers are allowed to sign, and a
 * CosmicLink have to be [locked]{@link CosmicLink#lock} before signing.
 *
 * @alias CosmicLink#sign
 * @param {...Keypair|Buffer|string} ...keypairs_or_preimage
 */
action.sign = async function (cosmicLink, ...keypairsOrPreimage) {
  if (!cosmicLink.locker) throw new Error("cosmicLink is not locked.")
  resolve.useNetwork(cosmicLink)

  const transaction = cosmicLink.transaction
  let allFine = true

  if (typeof keypairsOrPreimage[0] !== "string") {
    for (let index in keypairsOrPreimage) {
      const keypair = keypairsOrPreimage[index]
      const publicKey = keypair.publicKey()

      if (!cosmicLink.transaction.hasSigner(publicKey)) {
        const short = helpers.shorter(publicKey)
        status.error(cosmicLink, "Not a legit signer: " + short)
        allFine = false
        continue
      }

      if (cosmicLink.transaction.hasSigned(publicKey)) continue

      try {
        transaction.sign(keypair)
      } catch (error) {
        console.error(error)
        const short = helpers.shorter(publicKey)
        status.error(cosmicLink, "Failed to sign with key: " + short)
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
      status.error(cosmicLink, "Failed to sign with preimage: " + short, "throw")
    }
  }

  /// Update other formats.
  ["_query", "_xdr", "_sep7"].forEach(format => delete cosmicLink[format])
  updateSignersNode(cosmicLink)

  if (!allFine) throw new Error("Some signers where invalid")
  else return transaction
}

function updateSignersNode (cosmicLink) {
  if (cosmicLink._signersNode) {
    const signersNode = format.signatures(cosmicLink, cosmicLink._transaction)
    cosmicLink.htmlDescription.replaceChild(signersNode, cosmicLink._signersNode)
    cosmicLink._signersNode = signersNode
  }
}

/**
 * Send CosmicLink's transaction to a blockchain validator, or to
 * [StellarGuard]{@link https://stellarguard.me} when relevant. A
 * CosmicLink have to be [locked]{@link CosmicLink#lock} before sending.
 *
 * Returns a promise that resolve/reject to the horizon server response.
 *
 * @example
 * cosmicLink.send()
 *   .then(console.log)
 *   .catch(console.error)
 *
 * @alias CosmicLink#send
 * @param {horizon} [horizon] An horizon node URL
 * @return {Object} The server response
 */
action.send = async function (cosmicLink, horizon = cosmicLink.horizon) {
  if (!cosmicLink.locker) throw new Error("cosmicLink is not locked.")
  const server = resolve.server(cosmicLink, horizon)

  if (cosmicLink.transaction.hasSigner(STELLARGUARD_PUBKEY)) {
    let endpoint
    if (cosmicLink.network === "public") endpoint = "https://stellarguard.me/api"
    else if (cosmicLink.network === "test") endpoint = "https://test.stellarguard.me/api"
    if (endpoint) {
      return axios.post(endpoint + "/transactions", { xdr: cosmicLink.xdr })
        .then(result => result.data)
    }
  } else {
    return server.submitTransaction(cosmicLink.transaction)
  }
}

const STELLARGUARD_PUBKEY = "GCVHEKSRASJBD6O2Z532LWH4N2ZLCBVDLLTLKSYCSMBLOYTNMEEGUARD"
