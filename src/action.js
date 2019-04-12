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
const format = env.isBrowser && require("./format")
const resolve = require("./resolve")
const signersUtils = require("./signers-utils")
const status = require("./status")

/**
 * Lock a CosmicLink to a network/source pair. If the cosmicLink was created
 * from a query/uri/tdesc/json, it will create the corresponding
 * transaction/xdr/sep7 formats.
 *
 * This operation must be performed by the wallet before signing & sending the
 * transaction.
 *
 * @example
 * cosmicLib.config.network = "test"
 * const cosmicLink = new CosmicLink("?setOptions")
 * console.log(cosmicLink.network) // => undefined
 * console.log(cosmicLink.xdr)     // => undefined
 * await cosmicLink.lock()
 * console.log(cosmicLink.network) // => "test"
 * console.log(cosmicLink.xdr)     // => "AAAA...AA=="
 *
 *
 * @alias CosmicLink#lock
 * @async
 * @param {Object} [options]
 * @param {string} options.network Local fallback network
 * @param {string} options.horizon Local fallback horizon (overwrited by global configuration)
 * @param {string} options.callback Local fallback callback
 * @param {string} options.source Local fallback source
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
    source:
      cosmicLink.tdesc.source || options.source || cosmicLink.config.source,
    network:
      cosmicLink.tdesc.network || options.network || cosmicLink.config.network,
    horizon: options.horizon || cosmicLink.horizon,
    callback:
      cosmicLink.tdesc.callback
      || options.callback
      || cosmicLink.config.callback
  }

  /// Preserve the underlying tdesc object.
  cosmicLink._tdesc = Object.assign({}, cosmicLink.tdesc, cosmicLink.locker)
  delete cosmicLink._query
  delete cosmicLink._json

  if (!cosmicLink._transaction) {
    cosmicLink._transaction = await convert.tdescToTransaction(
      cosmicLink,
      cosmicLink.tdesc
    )
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
      status.error(
        cosmicLink,
        "Failed to sign with preimage: " + short,
        "throw"
      )
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
    cosmicLink.htmlDescription.replaceChild(
      signersNode,
      cosmicLink._signersNode
    )
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

  try {
    if (cosmicLink.transaction.hasSigner(STELLARGUARD_PUBKEY)) {
      return await sendToStellarGuard(cosmicLink)
    } else if (cosmicLink.callback) {
      return await axios.post(cosmicLink.callback, { xdr: cosmicLink.xdr })
    } else {
      return await sendToHorizon(cosmicLink, horizon)
    }
  } catch (error) {
    if (error.response) console.error(error.message, error.response)
    throw error
  }
}

async function sendToHorizon (cosmicLink, horizon) {
  const server = resolve.server(cosmicLink, horizon)

  // Keep connection alive until transaction gets validated or a non-504 error
  // is returned. 504 error means the transaction is still following the
  // validation process.
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      return await server.submitTransaction(cosmicLink.transaction)
    } catch (error) {
      if (error.status !== 504) throw error
    }
  }
}

function sendToStellarGuard (cosmicLink) {
  const url =
    cosmicLink.network === "test"
      ? "https://test.stellarguard.me/api/transactions"
      : "https://stellarguard.me/api/transactions"
  return axios
    .post(url, {
      xdr: cosmicLink.xdr,
      callback: cosmicLink.callback
    })
    .then(result => result.data)
}

const STELLARGUARD_PUBKEY =
  "GCVHEKSRASJBD6O2Z532LWH4N2ZLCBVDLLTLKSYCSMBLOYTNMEEGUARD"
