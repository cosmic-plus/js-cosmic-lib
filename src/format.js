'use strict'
/**
 * Contains methods to format a `transaction descriptor` into CSS/HTML for
 * display in browser.
 *
 * @private
 * @exports format
 */
const format = exports

const event = require('./event')
const specs = require('./specs')
const resolve = require('./resolve')

const html = require('ticot-box/html')
const helpers = require('ticot-box/misc')

/**
 * Returns an HTML div describing `tdesc`.
 *
 * @param {Object} tdesc Transaction descriptor.
 * @return {HTMLElement} Transaction HTML description.
 */
format.tdesc = function (conf, tdesc) {
  const trNode = html.create('div', '.CL_transactionNode')

  let infoNode
  specs.transactionOptionalFields.forEach(entry => {
    if (tdesc[entry]) {
      if (!infoNode) infoNode = html.create('ul', '.CL_sideInfo')
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
  const opNode = html.create('div', '.CL_operation')

  if (odesc.source) {
    html.appendClass(opNode, 'CL_sourcedOperation')
    const sourceNode = html.create('div', '.CL_source', 'Source: ')
    const addressNode = format.source(conf, odesc.source)
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
        if (odesc.signer.weight === '0') msg += 'Remove signer: {signer}{newline}'
        else msg += 'Set signer: {signer}{newline}'
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
 * Returns an HTML div describing `field` `value`.
 *
 * @param {string} field The field name of `value` as defined in `spec.js`.
 * @param {*} value The value of `field`.
 * @return {HTLMElement} `field` `value` HTML description
 */
format.field = function (conf, field, value) {
  let type = specs.fieldType[field]
  if (!type) throw new Error('Unknow field: ' + field)

  if (typeof value === 'object' && value.error) type = 'error'
  const formatter = process[type] || process.string
  const fieldNode = formatter(conf, value)
  fieldNode.className = 'CL_' + type

  let clickableNode = fieldNode
  if (type === 'asset') clickableNode = html.grab('.CL_assetCode', fieldNode)

  const eventObject = {
    conf: conf,
    field: field,
    fieldType: type,
    value: value,
    node: fieldNode
  }
  if (conf.constructor.name === 'CosmicLink') eventObject.cosmicLink = conf
  clickableNode.onclick = () => event.callClickHandler(conf, type, eventObject)

  return fieldNode
}

/**
 * Returns an HTML div describing `signers`.
 *
 * @param {Object} signers Signers object as returned by @see{resolve.signers}.
 * @return {HTMLElement} Signers HTML description
 */
format.signatures = function (conf, signers) {
  const signersNode = html.create('div', '.CL_signersNode')
  if (signers.list.length < 2 && !signers.signatures) return signersNode

  signers.sources.forEach(accountId => {
    const div = makeAccountSignersNode(conf, accountId, signers)
    html.append(signersNode, div)
  })

  return signersNode
}

function makeAccountSignersNode (conf, accountId, signers) {
  const accountSignersNode = html.create('div')

  const title = 'Signers for ' + helpers.shorter(accountId)
  const titleNode = html.create('span', '.CL_threshold', title)
  const listNode = html.create('ul', '.CL_signers')
  html.append(accountSignersNode, titleNode, listNode)

  signers[accountId].forEach(signer => {
    const signerNode = format.signer(conf, signer)
    const lineNode = html.create('li', null, signerNode)
    if (signers.hasSigned(signer.key)) {
      html.appendClass(lineNode, 'CL_signed')
      listNode.insertBefore(lineNode, listNode.firstChild)
    } else {
      html.append(listNode, lineNode)
    }
  })

  return accountSignersNode
}

/******************************************************************************/

for (let field in specs.fieldType) {
  format[field] = (conf, value) => format.field(conf, field, value)
}

/******************************************************************************/

const process = {}

process.string = function (conf, string) {
  return document.createTextNode(string)
}

process.error = function (conf, error) {
  const errorNode = html.create('span', '.CL_error', error.value)
  errorNode.title = 'Invalid value'
  return errorNode
}

process.address = function (conf, address) {
  const addressNode = html.create('span',
    { title: 'Resolving...', className: 'CL_address' },
    helpers.shorter(address),
    html.create('span', '.CL_loadingAnim')
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
    console.error(error)
    addressNode.title = "Can't resolve address"
    html.appendClass(addressNode, 'CL_error')

    const parent = addressNode.parentNode
    if (parent.className === 'CL_assetIssuer') {
      parent.style.display = 'inline'
    }
  }

  const animation = html.grab('.CL_loadingAnim', addressNode)
  if (animation) html.destroy(animation)
  const grandpa = addressNode.parentNode.parentNode
  if (grandpa && grandpa.className === 'CL_asset') {
    html.destroy(html.grab('.CL_loadingAnim', grandpa))
  }
}

process.asset = function (conf, asset) {
  const codeNode = html.create('span', '.CL_assetCode', asset.code)
  const issuerNode = html.create('span', '.CL_assetIssuer')
  const assetNode = html.create('span', '.CL_asset', codeNode, issuerNode)

  if (asset.issuer) {
    codeNode.title = 'Issued by ' + asset.issuer
    html.append(issuerNode, ' issued by ')
    html.append(issuerNode, format.assetIssuer(conf, asset.issuer))
    html.append(codeNode, html.create('span', '.CL_loadingAnim'))
  } else {
    codeNode.title = 'Native asset'
    html.append(issuerNode, ' native asset')
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

process.date = function (conf, timestamp) {
  const date = new Date(timestamp * 1000)
  return html.create('span', {}, date.toLocaleString())
}

process.hash = function (conf, hash) {
  return html.create('span', { title: hash }, helpers.shorter(hash))
}

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
  const typeNode = html.create('span', '.CL_memoType', memo.type)
  let valueNode
  if (memo.value.length > 30) {
    valueNode = format.memoHash(conf, memo.value)
    html.appendClass(valueNode, '.CL_memoValue')
  } else {
    valueNode = html.create('span', '.CL_memoValue', memo.value)
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
  if (signer.type === 'key' || signer.type === 'ed25519_public_key') {
    const value = signer.value || signer.key
    html.append(signerNode, 'Account ', format.signerAddress(conf, value))
  } else if (signer.type === 'hash' || signer.type === 'sha256_hash') {
    const value = signer.value || StellarSdk.StrKey.decodeSha256Hash(signer.key).toString('hex')
    html.append(signerNode, 'Key whose hash is ', format.signerHash(conf, value))
  } else if (signer.type === 'tx') {
    html.append(signerNode, 'Transaction ', format.signerTx(conf, signer.value))
  }
  if (signer.weight > 1) {
    html.append(signerNode, ' (weight: ' + signer.weight + ')')
  }
  return signerNode
}
