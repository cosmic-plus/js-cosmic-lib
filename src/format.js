'use strict'
/**
 * Contains methods to format a `transaction descriptor` into CSS/HTML for
 * display in browser.
 *
 * @private
 * @exports format
 */
const format = exports

const helpers = require('@cosmic-plus/jsutils/misc')
const html = require('@cosmic-plus/jsutils/html')
const StellarSdk = require('@cosmic-plus/base/stellar-sdk')

const event = require('./event')
const specs = require('./specs')
const resolve = require('./resolve')

/**
 * Returns an HTML div describing `tdesc`.
 *
 * @param {Object} tdesc Transaction descriptor.
 * @return {HTMLElement} Transaction HTML description.
 */
format.tdesc = function (conf, tdesc) {
  const trNode = html.create('div', '.cosmiclib_transactionNode')

  let infoNode
  specs.transactionOptionalFields.forEach(entry => {
    if (tdesc[entry]) {
      if (!infoNode) infoNode = html.create('ul', '.cosmiclib_sideInfo')
      const lineNode = html.create('li', {},
        specs.fieldDesc[entry] + ': ',
        format.field(conf, entry, tdesc[entry])
      )
      html.append(infoNode, lineNode)
    }
  })
  if (infoNode) html.append(trNode, infoNode)

  /// Sort operations so that the ones with declared sources are at the end.
  /// (makes data presentation better)
  let operations = tdesc.operations.sort(entry => entry.source ? 1 : 0)

  try {
    for (let index in operations) {
      const operation = tdesc.operations[index]
      const opNode = format.odesc(conf, operation)
      html.append(trNode, opNode)
    }
  } catch (error) {
    console.error(error)
  }

  return trNode
}

/**
 * Returns an HTML div describing `odesc`.
 *
 * @param {Object} odesc Operation in cosmic link JSON format.
 * @return {HTMLElement} Operation HTML description.
 */
format.odesc = function (conf, odesc) {
  const opNode = html.create('div', '.cosmiclib_operation')

  if (odesc.source) {
    html.appendClass(opNode, 'cosmiclib_sourcedOperation')
    const sourceNode = html.create('div', '.cosmiclib_sideInfo', 'Source: ')
    const addressNode = format.address(conf, odesc.source)
    html.append(sourceNode, addressNode)
    html.append(opNode, sourceNode)
  }

  let meaning = operationMeaning(odesc)
  while (meaning) {
    if (meaning.substr(0, 1) === '{') {
      const query = meaning.substr(1).replace(/}.*/, '')
      meaning = meaning.replace(/^[^}]*}/, '')
      if (query === 'newline') {
        if (meaning === '') break
        html.append(opNode, html.create('br'))
      } else {
        const fieldNode = format.field(conf, query, odesc[query])
        html.append(opNode, fieldNode)
      }
    } else {
      const txt = meaning.replace(/{.*/, '')
      meaning = meaning.replace(/^[^{]*/, '')
      html.append(opNode, txt)
    }
  }
  return opNode
}

/**
 * Returns a string describing `odesc`.
 *
 * @private
 */
function operationMeaning (odesc) {
  let msg
  switch (odesc.type) {
    case 'accountMerge':
      return 'Merge account inside {destination}'
    case 'allowTrust':
      if (odesc.authorize) {
        return 'Allow usage of your asset {assetCode} to {trustor}'
      } else {
        return 'Deny usage of your asset {assetCode} to {trustor}'
      }
    case 'bumpSequence':
      return 'Set account sequence number to {bumpTo}'
    case 'changeTrust':
      if (odesc.limit === '0') {
        return 'Refuse asset {asset}'
      } else if (odesc.limit) {
        return 'Set holding limit as {limit} for asset {asset}'
      } else {
        return 'Accept asset {asset}'
      }
    case 'createAccount':
      return 'Create account {destination} and send it {startingBalance} XLM'
    case 'createPassiveOffer':
      return 'Passive offer of {amount} {selling} at {price} {buying} / unit'
    case 'inflation':
      return 'Run inflation'
    case 'manageData':
      if (odesc.value) {
        return "Set data entry '{name}' as '{value}'"
      } else {
        return "Delete data entry '{name}'"
      }
    case 'manageOffer':
      if (!odesc.offerId || odesc.offerId === '0') {
        return 'Offer {amount} {selling} at {price} {buying} / unit'
      } else if (odesc.amount !== '0') {
        return "Change offer '{offerId}' to: offer {amount} {selling} at " +
          '{price} {buying} / unit'
      } else {
        return "Delete offer '{offerId}'"
      }
    case 'pathPayment':
      msg = 'Send {destAmount} {destAsset} to {destination} for a maximum ' +
        'of {sendMax} {sendAsset}'
      if (odesc.path) msg += ' using conversion path: {path}'
      return msg
    case 'payment':
      return 'Send {amount} {asset} to {destination}'
    case 'setOptions':
      msg = ''
      if (odesc.inflationDest) {
        msg += 'Set inflation destination to: {inflationDest}{newline}'
      }
      if (odesc.clearFlags) msg += 'Clear flag(s): {clearFlags}{newline}'
      if (odesc.setFlags) msg += 'Set flag(s): {setFlags}{newline}'
      if (odesc.masterWeight) {
        if (odesc.masterWeight === '0') {
          msg += 'Delete master key{newline}'
        } else {
          msg += 'Set master key weight at: {masterWeight}{newline}'
        }
      }
      ['lowThreshold', 'medThreshold', 'highThreshold'].forEach(field => {
        if (odesc[field]) msg += 'Set ' + field + ' at: {' + field + '}{newline}'
      })
      if (odesc.signer) {
        if (odesc.signer.type === 'tx') {
          if (odesc.signer.weight === '0') msg += 'Remove pre-signed {signer}{newline}'
          else msg += 'Pre-sign {signer}{newline}'
        } else {
          if (odesc.signer.weight === '0') msg += 'Remove signer: {signer}{newline}'
          else msg += 'Set signer: {signer}{newline}'
        }
      }
      if (odesc.homeDomain) msg += 'Set home domain: {homeDomain}{newline}'
      if (odesc.homeDomain === '') msg += 'Unset home domain'
      if (!msg) msg = 'Do nothing'
      return msg
    default:
      throw new Error('Unknow operation: ' + odesc.type)
  }
}

/**
 * Returns an HTML div describing `signers`.
 *
 * @param {Object} signers Signers object as returned by @see{resolve.signers}.
 * @return {HTMLElement} Signers HTML description
 */
format.signatures = function (conf, signers) {
  const signersNode = html.create('div', '.cosmiclib_signersNode')
  if (signers.list.length < 2 && !signers.signatures.length) return signersNode

  signers.sources.forEach(accountId => {
    if (accountId !== specs.neutralAccountId) {
      const div = makeAccountSignersNode(conf, accountId, signers)
      html.append(signersNode, div)
    }
  })

  return signersNode
}

function makeAccountSignersNode (conf, accountId, signers) {
  const accountSignersNode = html.create('div')

  const title = 'Signers for ' + helpers.shorter(accountId)
  const titleNode = html.create('span', '.cosmiclib_threshold', title)
  const listNode = html.create('ul', '.cosmiclib_signers')
  html.append(accountSignersNode, titleNode, listNode)

  signers[accountId].forEach(signer => {
    const signerNode = format.signer(conf, signer)
    const lineNode = html.create('li', null, signerNode)
    if (signers.hasSigned(signer.key)) {
      html.appendClass(lineNode, 'cosmiclib_signed')
      listNode.insertBefore(lineNode, listNode.firstChild)
    } else {
      html.append(listNode, lineNode)
    }
  })

  return accountSignersNode
}

/******************************************************************************/

/**
 * Returns an HTML div describing `field` `value`.
 *
 * @param {string} field The field name of `value` as defined in `spec.js`.
 * @param {*} value The value of `field`.
 * @return {HTLMElement} `field` `value` HTML description
 */
format.field = function (conf, field, value) {
  const type = specs.fieldType[field]
  if (!type) throw new Error('Unknow field: ' + field)

  const domNode = format.type(conf, type, value)
  domNode.field = field
  if (field !== type) html.appendClass(domNode, 'cosmiclib_' + field)

  return domNode
}

format.type = function (conf, type, value) {
  if (typeof value === 'object' && value.error) type = 'error'
  const formatter = process[type] || process.string
  const domNode = formatter(conf, value)
  domNode.className = 'cosmiclib_' + type

  const eventObject = {
    conf: conf,
    type: type,
    value: value,
    domNode: domNode
  }
  if (conf.constructor.name === 'CosmicLink') eventObject.cosmicLink = conf
  domNode.onclick = () => event.callClickHandler(conf, type, eventObject)
  return domNode
}

/// Provide a format method for each data type.
specs.types.forEach(type => {
  format[type] = (conf, value) => format.type(conf, type, value)
})

/******************************************************************************/

const process = {}

process.string = function (conf, string) {
  return html.create('span', null, string)
}

process.error = function (conf, errDesc) {
  const errorNode = html.create('span', '.cosmiclib_error')
  errorNode.textContent = errDesc.value === '' ? '(undefined)' : errDesc.value
  errorNode.title = errDesc.error.message
  return errorNode
}

process.address = function (conf, address) {
  const addressNode = html.create('span',
    { title: 'Resolving...' },
    helpers.shorter(address),
    html.create('span', '.cosmiclib_loadingAnim')
  )

  resolveAddressAndUpdate(conf, address, addressNode)
  return addressNode
}

async function resolveAddressAndUpdate (conf, address, addressNode) {
  try {
    const account = await resolve.address(conf, address)

    addressNode.title = account.account_id
    if (account.memo) {
      addressNode.title += `\nMemo (${account.memo_type}): ${account.memo}`
    }

    if (account.address) addressNode.textContent = account.address
    else if (account.alias) addressNode.textContent = account.alias

    addressNode.extra = account
  } catch (error) {
    addressNode.title = "Can't resolve address"
    html.appendClass(addressNode, 'cosmiclib_error')

    const parent = addressNode.parentNode
    if (parent.classList.contains('cosmiclib_assetIssuer')) {
      parent.style.display = 'inline'
    }
  }

  const animation = html.grab('.cosmiclib_loadingAnim', addressNode)
  if (animation) html.destroy(animation)
  const grandpa = addressNode.parentNode.parentNode
  if (grandpa && grandpa.classList.contains('cosmiclib_asset')) {
    html.destroy(html.grab('.cosmiclib_loadingAnim', grandpa))
  }
}

process.asset = function (conf, asset) {
  const codeNode = format.field(conf, 'assetCode', asset.code)
  const issuerNode = html.create('span', null, ' issued by ')
  const assetNode = html.create('span', null, codeNode, issuerNode)
  issuerNode.style.display = 'none'

  if (asset.issuer) {
    codeNode.title = 'Issued by ' + asset.issuer
    html.append(issuerNode, format.field(conf, 'assetIssuer', asset.issuer))
    html.append(codeNode, html.create('span', '.cosmiclib_loadingAnim'))
  } else {
    codeNode.title = 'Native asset'
    html.append(issuerNode, ' native asset')
  }

  codeNode.onclick = () => {
    if (issuerNode.style.display === 'inline') issuerNode.style.display = 'none'
    else issuerNode.style.display = 'inline'
  }

  return assetNode
}

process.assetsArray = function (conf, assetsArray) {
  const assetsArrayNode = html.create('span')
  for (let i = 0; i < assetsArray.length; i++) {
    if (i !== 0) html.append(assetsArrayNode, ', ')
    html.append(assetsArrayNode, format.asset(conf, assetsArray[i]))
  }

  return assetsArrayNode
}

process.date = function (conf, date) {
  return html.create('span', {}, new Date(date).toLocaleString())
}

process.hash = function (conf, hash) {
  return html.create('span', { title: hash }, helpers.shorter(hash))
}

process.id = process.hash

process.flags = function (conf, flags) {
  let string = ''
  if (flags >= 4) {
    string = 'immutable'
    flags = flags - 4
  }
  if (flags >= 2) {
    if (string) string = ', ' + string
    string = 'revocable' + string
    flags = flags - 2
  }
  if (+flags === 1) {
    if (string) string = ', ' + string
    string = 'required' + string
  }

  return html.create('span', {}, string)
}

process.memo = function (conf, memo) {
  const typeNode = format.field(conf, 'memoType', memo.type)
  let valueNode
  switch (memo.type) {
    case 'text':
      valueNode = format.field(conf, 'memoText', memo.value)
      break
    case 'id':
      valueNode = format.field(conf, 'memoId', memo.value)
      break
    case 'hash':
      valueNode = format.field(conf, 'memoHash', memo.value)
      break
    case 'return':
      valueNode = format.field(conf, 'memoReturn', memo.value)
  }
  return html.create('span', {}, '(', typeNode, ') ', valueNode)
}

process.price = function (conf, price) {
  if (typeof price === 'string') {
    return html.create('span', {}, price)
  } else {
    return html.create('span', {}, price.n / price.d + '')
  }
}

process.signer = function (conf, signer) {
  const signerNode = html.create('span')
  switch (signer.type) {
    case 'key':
    case 'ed25519_public_key':
      const value1 = signer.value || signer.key
      html.append(signerNode, 'Account ', format.field(conf, 'signerKey', value1))
      break
    case 'tx':
      const value2 = signer.value || signer.key
      html.append(signerNode, 'transaction ', format.field(conf, 'signerTx', value2))
      break
    case 'hash':
    case 'sha256hash':
      const value3 = signer.value || StellarSdk.StrKey.decodeSha256Hash(signer.key).toString('hex')
      html.append(signerNode, 'key whose hash is ', format.field(conf, 'signerHash', value3))
      break
  }
  if (signer.weight > 1) {
    const weightNode = format.weight(conf, signer.weight)
    html.append(signerNode, ' (weight: ', weightNode, ')')
  }
  return signerNode
}
