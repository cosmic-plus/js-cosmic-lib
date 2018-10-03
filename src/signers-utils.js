'use_strict'
/**
 * This module provides two ways to generate {@link SignersUtils} for a
 * Transaction object. The first one extends the object and is the intended way
 * to use those utilities. However, as extending objects can sometimes prove
 * inconvenient or intrusive, a second method allows to create a stand-alone
 * {@link SignersUtils} tied to a given transaction.
 *
 * @exports signersUtils
 */
const signersUtils = exports

const resolve = require('./resolve')

const helpers = require('@cosmic-plus/jsutils/misc')
const StellarSdk = require('@cosmic-plus/base/stellar-sdk')

/**
 * **SignersUtils** is a toolbox that aims to ease the handling of
 * multisignature transactions. The idea behind it is to fetch all required
 * data once and to cache the responses into the transaction. Then, all
 * the utilities can function in a synchronous (immediate) manner.
 *
 * Those are automatically available in `cosmicLink.transaction` after
 * `await cosmicLink.lock()` is ran. Alternatively, you can extend a transaction
 * or generate its SignersUtils by using {@link module:signersUtils}. There's no
 * `cosmicLib.SignersUtils` constructor.
 *
 * An instance of SignersUtils is always tied to a given transaction. This is
 * why none of the provided methods take a transaction as parameter.
 *
 * >
 * | Members                                                                     | Methods
 * |-----------------------------------------------------------------------------|-------------
 * | [sources]{@link SignersUtils#sources}: Array of transaction sources         | [hasSigner]{@link SignersUtils#hasSigner}: Test if a key is a legit signer for transaction
 * | [signers]{@link SignersUtils#signers}: Table of transaction signers         | [hasSigned]{@link SignersUtils#hasSigned}: Test if a key has signed transaction
 * | [signersList]{@link SignersUtils#signersList}: Array of transaction signers |
 *
 * @example
 * const cosmicLink = new CosmicLink({ memo: 'Donation', maxDate: 2019 })
 *  .addOperation('payment', { destination: 'tips*cosmic.link', amount: 10 })
 *
 * await cosmicLink.lock({ network: 'test', source: 'myaddress*example.org' })
 *
 * console.log(cosmicLink.transaction.signers)
 * console.log(cosmicLink.transaction.hasSigner(GB...DXEZ))
 *
 * @alias SignersUtils
 * @namespace
 */
class SignersUtils {
  static async resolve (conf, transaction, extendFlag) {
    const extra = resolve.extra(conf, transaction)

    if (!extra.cache.signersUtils) {
      resolve.useNetwork(extra)
      extra.cache.txHash = transaction.hash()
      const utils = new SignersUtils(extra, transaction)
      /**
       * A list of the sources involved in the transaction.
       * @alias SignersUtils#sources
       * @type {Array}
       */
      utils.sources = await resolve.txSources(extra, transaction)
      /**
       * A table of the signers for each transaction source.
       * @alias SignersUtils#signers
       * @type {Object}
       */
      utils.signers = await resolve.txSigners(extra, transaction)
      /**
       * A list of the legit signers for the transaction.
       * @alias SignersUtils#signersList
       * @type {Array}
       */
      utils.signersList = await resolve.txSignersList(extra, transaction)
      Object.assign(utils, utilities)
      extra.cache.signersUtils = utils
    }

    if (extendFlag) {
      if (!transaction.hasSigner) Object.assign(transaction, extra.cache.signersUtils)
      return transaction
    } else {
      return extra.cache.signersUtils
    }
  }

  constructor (conf, transaction) {
    this.signatures = transaction.signatures
    helpers.setHiddenProperty(this, '_cosmicplus', transaction._cosmicplus)
  }
}

/******************************************************************************/

const utilities = {}

/**
 * Tests if **accountId** is a legit signer for the transaction.
 *
 * @example
 * if (transaction.hasSigner(GB...DEZX)) console.log('Legit signer')
 *
 * @alias SignersUtils#hasSigner
 * @param {string} accountId
 * @return {boolean}
 */
utilities.hasSigner = function (accountId) {
  return this.signersList.find(key => key === accountId)
}

/**
 * Tests if **accountId** has signed the transaction.
 *
 * @example
 * if (transaction.hasSigned(GB...DEZX)) console.log('Has signed')
 *
 * @alias SignersUtils#hasSigned
 * @param {string} accountId
 * @return {boolean}
 */
utilities.hasSigned = function (accountId) {
  if (accountId.substr(0, 1) === 'G') {
    const keypair = StellarSdk.Keypair.fromPublicKey(accountId)
    const txHash = this._cosmicplus.cache.txHash
    return !!this.signatures.find(entry => keypair.verify(txHash, entry.signature()))
  }
}

/******************************************************************************/

/**
 * Returns SignersUtils for **transaction**.
 *
 * @async
 * @param {Transaction} transaction
 * @return {SignersUtils}
 */
signersUtils.for = (conf, transaction) => SignersUtils.resolve(conf, transaction)

/**
 * Extends **transaction** with SignersUtils.
 *
 * @async
 * @param {Transaction} transaction
 * @return {Transaction}
 */
signersUtils.extends = (conf, transaction) => SignersUtils.resolve(conf, transaction, true)
