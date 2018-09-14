'use_strict'
/**
 * The **Signers** class is helpfull for handling the various computation that
 * relate with getting transaction signers, checking for signatures and
 * thresholds.
 *
 * @private
 */
const resolve = require('./resolve')

const helpers = require('ticot-box/misc')

const Signers = class Signers {
  constructor (conf, transaction) {
    // We only do the synchronous stuff here.
    setInternalProperty(this, '_conf', conf)
    setInternalProperty(this, '_transaction', transaction)
    setInternalProperty(this, '_sources', txSources(conf, transaction))
    setInternalProperty(this, 'accounts', {})
  }

  get signatures () {
    return this._transaction.signatures
  }

  get sources () {
    return this._sources
  }

  get list () {
    if (this._list) return this._list

    const array = []
    this.sources.forEach(accountId => {
      this[accountId].forEach(entry => {
        if (!array.find(key => key === entry.key)) array.push(entry.key)
      })
    })

    setInternalProperty(this, '_list', array)
    return array
  }

  hasSigner (accountId) {
    return this.list.find(key => key === accountId)
  }

  hasSigned (accountId) {
    if (accountId.substr(0, 1) === 'G') {
      const keypair = StellarSdk.Keypair.fromPublicKey(accountId)
      resolve.useNetwork(this._conf)
      const txHash = this._transaction.hash()
      return !!this.signatures.find(entry => keypair.verify(txHash, entry.signature()))
    }
  }
}

function setInternalProperty (object, name, value) {
  Object.defineProperty(object, name, { value: value, enumerable: false, writable: false })
}

function txSources (conf, transaction) {
  const extra = helpers.useExtra(transaction)
  if (extra.sources) return extra.sources

  const array = [ transaction.source ]
  transaction.operations.forEach(entry => {
    const source = entry.source
    if (source && !array.find(a => a === source)) array.push(source)
  })

  extra.sources = array
  return array
}

const resolveSigners = async function (conf, transaction) {
  const signers = new Signers(conf, transaction)

  // Populate the signers object.
  for (let index in signers.sources) {
    const accountId = signers.sources[index]
    if (!signers[accountId]) {
      const account = await resolve.account(signers._conf, accountId)
      signers[accountId] = account.signers.filter(signerIsNotPreauthTx)
    }
  }

  return signers
}

function signerIsNotPreauthTx (signer) {
  return signer.type !== 'preauth_tx'
}

module.exports = resolveSigners
