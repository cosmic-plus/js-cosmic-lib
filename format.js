'use strict'

import * as node from './node'
import {shorter} from './helpers'

import * as specs from './specs'
import * as status from './status'
import * as resolve from './resolve'
import * as event from './event'

/**
 * Contains methods to format a `transaction descriptor` into CSS/HTML for
 * display in browser.
 *
 * @module
 */

/**
 * Populate `cosmicLink.transactionNode` with a description of `transaction
 * descriptor`.
 *
 * @param {CL}
 * @param {Object} tdesc Transaction descriptor
 */
export function tdesc (cosmicLink, tdesc) {
  const trNode = node.grab('.CL_transaction', cosmicLink.transactionNode)

  let infoNode
  specs.transactionOptionalFields.forEach(entry => {
    if (tdesc[entry]) {
      if (!infoNode) infoNode = node.create('ul', '.CL_sideInfo')
      const lineNode = node.create('li', {},
        _fieldDesc[entry] + ': ',
        field(cosmicLink, entry, tdesc[entry])
      )
      node.append(infoNode, lineNode)
    }
  })

  if (infoNode) node.append(trNode, infoNode)

  try {
    const opNode = _formatOdesc(cosmicLink, tdesc.operations[0])
    node.append(trNode, opNode)
  } catch (error) {
    console.log(error)
    status.error(cosmicLink, 'Unhandled formatting error')
  }
}

/**
 * Transaction field meaning.
 * @private
 */
const _fieldDesc = {
  source: 'Source',
  fee: 'Fees',
  minTime: 'Valid only after',
  maxTime: 'Valid only before',
  memo: 'Memo'
}

/**
 * Return an HTMLElement with `operation descriptor` in human language.
 *
 * @private
 * @param {CL}
 * @param {Object} odesc Operation Descriptor
 */
function _formatOdesc (cosmicLink, odesc) {
  const opNode = node.create('div', '.CL_operation')
  let meaning = _odescToMeaning(odesc)

  while (meaning) {
    if (meaning.substr(0, 1) === '{') {
      const query = meaning.substr(1).replace(/}.*/, '')
      meaning = meaning.replace(/^[^}]*}/, '')
      if (query === 'newline') {
        if (meaning === '') break
        node.append(opNode, node.create('br'))
      } else {
        const fieldNode = field(cosmicLink, query, odesc[query])
        node.append(opNode, fieldNode)
      }
    } else {
      const txt = meaning.replace(/{.*/, '')
      meaning = meaning.replace(/^[^{]*/, '')
      node.append(opNode, txt)
    }
  }
  return opNode
}

/**
 * Return a string that describe the meaning of `operation descriptor`.
 *
 * @private
 * @param {Object} odesc Operation descriptor
 * @return {string} Meaning of `operation descriptor`
 */
function _odescToMeaning (odesc) {
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
      ['lowThreshold', 'medThreshold', 'highTreshold'].forEach(field => {
        if (odesc[field]) msg += 'Set ' + field + ' at: {' + field + '}{newline}'
      })
      if (odesc.signer) {
        if (odesc.signer.weight === '0') msg += 'Remove signer: {signer}{newline}'
        else msg += 'Set signer: {signer}{newline}'
      }
      if (odesc.homeDomain) msg += 'Set home domain: {homeDomain}{newline}'
      return msg
    default:
      throw new Error('Unknow operation: ' + odesc.type)
  }
}

/**
 * Return an HTML element exposing `value`.
 *
 * @param {CL}
 * @param {string} field The field name of `value` as defined in `spec.js`
 * @return {HTLMElement} `value` formatted in HTML/CSS
 */
export function field (cosmicLink, field, value) {
  let type = specs.fieldType[field]
  if (!type) throw new Error('Unknow field: ' + field)

  if (typeof value === 'object' && value.error) type = 'error'

  const formatter = _format[type] || _format.string
  const fieldNode = formatter(cosmicLink, value)

  fieldNode.className = 'CL_' + type
  fieldNode.onClick = event.trigger(cosmicLink, type, value, fieldNode)
  return fieldNode
}

/******************************************************************************/

let _format = {}

_format.string = function (cosmicLink, string) {
  return document.createTextNode(string)
}

_format.error = function (cosmicLink, error) {
  const errorNode = node.create('span', '.CL_error', error.value)
  errorNode.title = 'Invalid value'
  return errorNode
}

_format.address = function (cosmicLink, address) {
  const addressNode = node.create('span',
    { title: 'Resolving...', className: 'CL_address' },
    shorter(address),
    node.create('span', '.CL_loadingAnim')
  )

  _resolveAddressAndUpdate(cosmicLink, address, addressNode)
  return addressNode
}

async function _resolveAddressAndUpdate (cosmicLink, address, addressNode) {
  try {
    const account = await resolve.address(cosmicLink, address)

    addressNode.title = account.account_id
    if (account.memo) {
      addressNode.title += `\nMemo (${account.memo_format}): ${account.memo}`
    }

    addressNode.onclick = event.trigger(cosmicLink, 'address', account,
      addressNode)
  } catch (error) {
    console.log(error)
    addressNode.title = "Can't resolve address"
    node.appendClass(addressNode, 'CL_error')

    const parent = addressNode.parentNode
    if (parent.className === 'CL_assetIssuer') {
      parent.style.display = 'inline'
    }
  }

  node.destroy(node.grab('.CL_loadingAnim', addressNode))
  const grandpa = addressNode.parentNode.parentNode
  if (grandpa.className === 'CL_asset') {
    node.destroy(node.grab('.CL_loadingAnim', grandpa))
  }
}

_format.asset = function (cosmicLink, asset) {
  const codeNode = node.create('span', '.CL_assetCode', asset.code)
  const issuerNode = node.create('span', '.CL_assetIssuer')
  const assetNode = node.create('span', '.CL_asset', codeNode, issuerNode)

  codeNode.onclick = event.trigger(cosmicLink, 'asset', asset, assetNode)

  if (asset.issuer) {
    codeNode.title = 'Issued by ' + asset.issuer
    node.append(issuerNode, ' issued by ')
    node.append(issuerNode, _format.address(cosmicLink, asset.issuer))
    node.append(codeNode, node.create('span', '.CL_loadingAnim'))
  } else {
    codeNode.title = 'Native asset'
    node.append(issuerNode, ' native asset')
  }

  return assetNode
}

_format.assetsArray = function (cosmicLink, assetsArray) {
  const assetsArrayNode = node.create('span')
  for (let i = 0; i < assetsArray.length; i++) {
    if (i !== 0) node.append(assetsArrayNode, ', ')
    node.append(assetsArrayNode, _format.asset(cosmicLink, assetsArray[i]))
  }

  return assetsArrayNode
}

_format.date = function (cosmicLink, timestamp) {
  const date = new Date(timestamp * 1000)
  return node.create('span', {}, date.toLocaleString())
}

_format.flags = function (cosmicLink, flags) {
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
  if (flags === 1) {
    if (string) string = ', ' + string
    string = 'required' + string
  }

  return node.create('span', {}, string)
}

_format.memo = function (cosmicLink, memo) {
  const typeNode = node.create('span', '.CL_memoType', memo.type)
  let valueNode
  if (memo.value.length > 30) {
    valueNode = _makeHashNode(memo.value)
    node.appendClass(valueNode, '.CL_memoValue')
  } else {
    valueNode = node.create('span', '.CL_memoValue', memo.value)
  }
  return node.create('span', {}, '(', typeNode, ') ', valueNode)
}

_format.price = function (cosmicLink, price) {
  if (typeof price === 'string') {
    return node.create('span', {}, price)
  } else {
    return node.create('span', {}, price.n / price.d + '')
  }
}

_format.signer = function (cosmicLink, signer) {
  const signerNode = node.create('span')
  switch (signer.type) {
    case 'key':
      node.append(signerNode, 'Account ')
      node.append(signerNode, _format.address(cosmicLink, signer.value))
      break
    case 'hash':
      node.append(signerNode,
        'Key whose hash is ',
        _makeHashNode(signer.value)
      )
      break
    case 'tx':
      node.append(signerNode,
        'Transaction whose hash is ',
        _makeHashNode(signer.value)
      )
  }
  if (signer.weight !== '0') {
    node.append(signerNode, ' with a weight of ' + signer.weight)
  }
  return signerNode
}

function _makeHashNode (hash) {
  return node.create('span',
    { className: 'CL_hash', title: hash, onclick: _copier(hash) },
    shorter(hash)
  )
}

/**
 * Return a function that copy `string` into user clipboard.
 *
 * @private
 * @param {string} string
 * @return {function}
 */
function _copier (string) {
  return function () {
    const textBox = node.create('textarea', {}, string)
    node.append(node.grab('body'), textBox)
    node.copyContent(textBox)
    node.destroy(textBox)
  }
}
