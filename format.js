'use strict'
/**
 * Contains methods to format a `transaction descriptor` into CSS/HTML for
 * display in browser.
 *
 * @exports format
 */
const format = exports

const helpers = require('./helpers')
const node = require('./node')
const check = require('./check')
const specs = require('./specs')
const status = require('./status')
const resolve = require('./resolve')
const event = require('./event')

/**
 * Populate `cosmicLink.transactionNode` with a description of `transaction
 * descriptor`.
 *
 * @param {CL}
 * @param {Object} tdesc Transaction descriptor
 */
format.tdesc = async function (cosmicLink) {
  const trNode = cosmicLink.transactionNode
  const tdesc = await cosmicLink.getTdesc()
  node.clear(trNode)

  let infoNode
  specs.transactionOptionalFields.forEach(entry => {
    if (tdesc[entry]) {
      if (!infoNode) infoNode = node.create('ul', '.CL_sideInfo')
      const lineNode = node.create('li', {},
        specs.fieldDesc[entry] + ': ',
        format.field(cosmicLink, entry, tdesc[entry])
      )
      node.append(infoNode, lineNode)
    }
  })
  if (infoNode) node.append(trNode, infoNode)

  /// Sort operations so that the ones with declared sources are at the end.
  /// (makes data presentation better)
  let operations = tdesc.operations.sort(entry => entry.source ? 1 : 0)

  try {
    for (let index in operations) {
      const operation = tdesc.operations[index]
      const opNode = format.operation(cosmicLink, operation)
      node.append(trNode, opNode)
    }
    format.signatures(cosmicLink)
  } catch (error) {
    console.error(error)
    status.error(cosmicLink, 'Unhandled formatting error')
  }
}

/**
 * Return an HTMLElement with `operation` in human language.
 *
 * @param {CL}
 * @param {Object} odesc Operation in cosmic link JSON format
 */
format.operation = function (cosmicLink, odesc) {
  const opNode = node.create('div', '.CL_operation')

  if (odesc.source) {
    node.appendClass(opNode, 'CL_sourcedOperation')
    const sourceNode = node.create('div', '.CL_source', 'Source: ')
    const addressNode = format.field(cosmicLink, 'source', odesc.source)
    node.append(sourceNode, addressNode)
    node.append(opNode, sourceNode)
  }

  let meaning = operationMeaning(odesc)
  while (meaning) {
    if (meaning.substr(0, 1) === '{') {
      const query = meaning.substr(1).replace(/}.*/, '')
      meaning = meaning.replace(/^[^}]*}/, '')
      if (query === 'newline') {
        if (meaning === '') break
        node.append(opNode, node.create('br'))
      } else {
        const fieldNode = format.field(cosmicLink, query, odesc[query])
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
 * Return an HTML element exposing `value`.
 *
 * @param {CL}
 * @param {string} field The field name of `value` as defined in `spec.js`
 * @param {*} value The value of that field
 * @return {HTLMElement} `value` formatted in HTML/CSS
 */
format.field = function (cosmicLink, field, value) {
  let type = specs.fieldType[field]
  if (!type) throw new Error('Unknow field: ' + field)

  check.type(cosmicLink, type)
  if (typeof value === 'object' && value.error) type = 'error'
  const formatter = format[type] || format.string
  const fieldNode = formatter(cosmicLink, value)

  fieldNode.className = 'CL_' + type

  let clickableNode = fieldNode
  if (type === 'asset') clickableNode = node.grab('.CL_assetCode', fieldNode)

  clickableNode.onclick = function () {
    const eventObject = {
      cosmicLink: cosmicLink,
      field: field,
      fieldType: type,
      value: value,
      node: fieldNode
    }
    event.callClickHandler(cosmicLink, type,
      Object.assign(eventObject, clickableNode.additionalEventData))
  }
  return fieldNode
}

/**
 * Returns an HTML node that displays signers for the transaction represented by
 * `cosmicLink`.
 *
 * @param {CL}
 * @return {HTMLElement} - A `div` element containing the signers
 */
format.signatures = async function (cosmicLink) {
  const signers = await cosmicLink.getSigners()
  const tdesc = await cosmicLink.getTdesc()
  if (signers.length < 2 && !tdesc.signatures) return

  const signersNode = cosmicLink.signersNode
  node.clear(signersNode)

  const titleNode = node.create('span', '.CL_threshold', 'Signatures')
  const listNode = node.create('ul', '.CL_signers')
  node.append(cosmicLink.signersNode, titleNode, listNode)

  signers.forEach(entry => {
    const signerNode = format.signer(cosmicLink, entry)
    const animation = node.create('span', '.CL_loadingAnim')
    const lineNode = node.create('li', null, signerNode, animation)
    entry.node = lineNode
    entry.getSignature().then(signature => {
      signature && node.appendClass(lineNode, 'CL_signed')
      node.destroy(animation)
    })
    node.append(listNode, lineNode)
  })
}

/******************************************************************************/

format.string = function (cosmicLink, string) {
  return document.createTextNode(string)
}

format.error = function (cosmicLink, error) {
  const errorNode = node.create('span', '.CL_error', error.value)
  errorNode.title = 'Invalid value'
  return errorNode
}

format.address = function (cosmicLink, address) {
  const addressNode = node.create('span',
    { title: 'Resolving...', className: 'CL_address' },
    helpers.shorter(address),
    node.create('span', '.CL_loadingAnim')
  )

  resolveAddressAndUpdate(cosmicLink, address, addressNode)
  return addressNode
}

async function resolveAddressAndUpdate (cosmicLink, address, addressNode) {
  try {
    const account = await resolve.address(cosmicLink, address)

    addressNode.title = account.account_id
    if (account.memo) {
      addressNode.title += `\nMemo (${account.memoexports}): ${account.memo}`
    }

    if (account.address) addressNode.textContent = account.address
    else if (account.alias) addressNode.textContent = account.alias

    addressNode.additionalEventData = { account: account }
  } catch (error) {
    console.error(error)
    addressNode.title = "Can't resolve address"
    node.appendClass(addressNode, 'CL_error')

    const parent = addressNode.parentNode
    if (parent.className === 'CL_assetIssuer') {
      parent.style.display = 'inline'
    }
  }

  const animation = node.grab('.CL_loadingAnim', addressNode)
  if (animation) node.destroy(animation)
  const grandpa = addressNode.parentNode.parentNode
  if (grandpa && grandpa.className === 'CL_asset') {
    node.destroy(node.grab('.CL_loadingAnim', grandpa))
  }
}

format.asset = function (cosmicLink, asset) {
  const codeNode = node.create('span', '.CL_assetCode', asset.code)
  const issuerNode = node.create('span', '.CL_assetIssuer')
  const assetNode = node.create('span', '.CL_asset', codeNode, issuerNode)

  if (asset.issuer) {
    codeNode.title = 'Issued by ' + asset.issuer
    node.append(issuerNode, ' issued by ')
    node.append(issuerNode, format.field(cosmicLink, 'assetIssuer', asset.issuer))
    node.append(codeNode, node.create('span', '.CL_loadingAnim'))
  } else {
    codeNode.title = 'Native asset'
    node.append(issuerNode, ' native asset')
  }

  return assetNode
}

format.assetsArray = function (cosmicLink, assetsArray) {
  const assetsArrayNode = node.create('span')
  for (let i = 0; i < assetsArray.length; i++) {
    if (i !== 0) node.append(assetsArrayNode, ', ')
    node.append(assetsArrayNode, format.asset(cosmicLink, assetsArray[i]))
  }

  return assetsArrayNode
}

format.date = function (cosmicLink, timestamp) {
  const date = new Date(timestamp * 1000)
  return node.create('span', {}, date.toLocaleString())
}

format.hash = function (cosmicLink, hash) {
  return node.create('span', { title: hash }, helpers.shorter(hash))
}

format.flags = function (cosmicLink, flags) {
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

  return node.create('span', {}, string)
}

format.memo = function (cosmicLink, memo) {
  const typeNode = node.create('span', '.CL_memoType', memo.type)
  let valueNode
  if (memo.value.length > 30) {
    valueNode = format.field(cosmicLink, 'memoHash', memo.value)
    node.appendClass(valueNode, '.CL_memoValue')
  } else {
    valueNode = node.create('span', '.CL_memoValue', memo.value)
  }
  return node.create('span', {}, '(', typeNode, ') ', valueNode)
}

format.price = function (cosmicLink, price) {
  if (typeof price === 'string') {
    return node.create('span', {}, price)
  } else {
    return node.create('span', {}, price.n / price.d + '')
  }
}

format.signer = function (cosmicLink, signer) {
  const signerNode = node.create('span')
  switch (signer.type) {
    case 'key':
      node.append(signerNode, 'Account ')
      node.append(signerNode, format.field(cosmicLink, 'signerAddress', signer.value))
      break
    case 'hash':
      node.append(signerNode,
        'Key whose hash is ',
        format.field(cosmicLink, 'signerHash', signer.value)
      )
      break
    case 'tx':
      node.append(signerNode,
        'Transaction ',
        format.field(cosmicLink, 'signerTx', signer.value)
      )
  }
  if (signer.weight > 1) {
    node.append(signerNode, ' (weight: ' + signer.weight + ')')
  }
  return signerNode
}
