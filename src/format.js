"use strict"
/**
 * Contains methods to format a `transaction descriptor` into CSS/HTML for
 * display in browser.
 *
 * @private
 * @exports format
 */
const format = exports

const misc = require("@cosmic-plus/jsutils/es5/misc")
const nice = require("@cosmic-plus/jsutils/es5/nice")
const html = require("@cosmic-plus/domutils/es5/html")
const StellarSdk = require("@cosmic-plus/base/stellar-sdk")

const config = require("./config")
const event = require("./event")
const resolve = require("./resolve")
const signersUtils = require("./signers-utils")
const specs = require("./specs")

/**
 * Returns an HTML div describing `tdesc`.
 *
 * @param {Object} tdesc Transaction descriptor.
 * @return {HTMLElement} Transaction HTML description.
 */
format.tdesc = function (conf, tdesc) {
  const trNode = html.create("div", ".cosmiclib_transactionNode")
  if (!tdesc) return trNode

  let infoNode
  for (let index in specs.transactionOptionalFields) {
    const entry = specs.transactionOptionalFields[index]
    if (entry === "horizon" && resolve.horizon(config, conf.network)) continue

    if (tdesc[entry]) {
      if (!infoNode) infoNode = html.create("ul", ".cosmiclib_sideInfo")
      const lineNode = html.create(
        "li",
        {},
        specs.fieldDesc[entry] + ": ",
        format.field(conf, entry, tdesc[entry])
      )
      html.append(infoNode, lineNode)
    }
  }
  if (infoNode) html.append(trNode, infoNode)

  try {
    for (let index in tdesc.operations) {
      const operation = tdesc.operations[index]
      const opNode = format.odesc(conf, operation)
      opNode.index = index
      html.append(trNode, opNode)
    }
  } catch (error) {
    console.error(error)
  }

  if (!tdesc.operations.length) {
    if (Object.keys(tdesc).length === 1) {
      html.append(trNode, html.create("div", null, "No transaction"))
    } else {
      html.append(
        trNode,
        html.create("div", ".cosmiclib_operation", "No operation")
      )
    }
  }

  trNode.tdesc = tdesc
  return trNode
}

/**
 * Returns an HTML div describing `odesc`.
 *
 * @param {Object} odesc Operation in cosmic link JSON format.
 * @return {HTMLElement} Operation HTML description.
 */
format.odesc = function (conf, odesc) {
  const opNode = html.create("div", ".cosmiclib_operation")
  opNode.odesc = odesc
  let retNode = opNode

  if (odesc.source) {
    retNode = html.create("div", ".cosmiclib_sourcedOperation")
    const sourceNode = html.create("div", ".cosmiclib_sideInfo", "Source: ")
    const addressNode = format.address(conf, odesc.source)
    html.append(sourceNode, addressNode)
    html.append(retNode, sourceNode, opNode)
  }

  let meaning = operationMeaning(odesc)
  while (meaning) {
    if (meaning.substr(0, 1) === "{") {
      const query = meaning.substr(1).replace(/}.*/, "")
      meaning = meaning.replace(/^[^}]*}/, "")
      if (query === "newline") {
        if (meaning === "") break
        html.append(opNode, html.create("br"))
      } else {
        const fieldNode = format.field(conf, query, odesc[query])
        html.append(opNode, fieldNode)
      }
    } else {
      const txt = meaning.replace(/{.*/, "")
      meaning = meaning.replace(/^[^{]*/, "")
      html.append(opNode, txt)
    }
  }
  return retNode
}

/**
 * Returns a string describing `odesc`.
 *
 * @private
 */
function operationMeaning (odesc) {
  let msg = ""
  switch (odesc.type) {
  case "accountMerge":
    return "Merge account inside {destination}"
  case "allowTrust":
    if (odesc.authorize) {
      return "Allow usage of your asset {assetCode} to {trustor}"
    } else {
      return "Deny usage of your asset {assetCode} to {trustor}"
    }
  case "bumpSequence":
    return "Set account sequence number to {bumpTo}"
  case "changeTrust":
    if (odesc.limit === "0") {
      return "Refuse asset {asset}"
    } else if (odesc.limit) {
      return "Set holding limit as {limit} for asset {asset}"
    } else {
      return "Accept asset {asset}"
    }
  case "createAccount":
    return "Create account {destination} and send {startingBalance} XLM to it"
  case "createPassiveOffer":
    return "Passive offer of {amount} {selling} at {price} {buying} / unit"
  case "inflation":
    return "Run inflation"
  case "manageData":
    if (odesc.value) {
      if (odesc.value.type === "text") {
        return "Set data entry '{name}' to: '{value}'"
      } else {
        return "Set data entry '{name}' to base64: '{value}'"
      }
    } else {
      return "Delete data entry '{name}'"
    }
  case "manageOffer":
    if (odesc.amount === "0") {
      return "Delete offer '{offerId}'"
    } else {
      if (odesc.offerId) {
        msg += "Change offer '{offerId}' to:{newline}"
      }
      msg += "Offer {amount} {selling} at {price} {buying} / unit"
      return msg
    }
  case "pathPayment":
    msg =
        "Send {destAmount} {destAsset} to {destination} for a maximum "
        + "of {sendMax} {sendAsset}"
    if (odesc.path) msg += " using conversion path: {path}"
    return msg
  case "payment":
    return "Send {amount} {asset} to {destination}"
  case "setOptions":
    if (odesc.inflationDest) {
      msg += "Set inflation destination to: {inflationDest}{newline}"
    }
    if (odesc.clearFlags) msg += "Clear flag(s): {clearFlags}{newline}"
    if (odesc.setFlags) msg += "Set flag(s): {setFlags}{newline}"
    if (odesc.masterWeight) {
      if (odesc.masterWeight === "0") {
        msg += "Delete master key{newline}"
      } else {
        msg += "Set master key weight at: {masterWeight}{newline}"
      }
    }
    ["lowThreshold", "medThreshold", "highThreshold"].forEach(field => {
      if (odesc[field])
        msg += "Set " + field + " at: {" + field + "}{newline}"
    })
    if (odesc.signer) {
      if (odesc.signer.type === "tx") {
        if (odesc.signer.weight === "0")
          msg += "Remove pre-signed {signer}{newline}"
        else msg += "Pre-sign {signer}{newline}"
      } else {
        if (odesc.signer.weight === "0")
          msg += "Remove signer: {signer}{newline}"
        else msg += "Set signer: {signer}{newline}"
      }
    }
    if (odesc.homeDomain) msg += "Set home domain: {homeDomain}{newline}"
    if (odesc.homeDomain === "") msg += "Unset home domain"
    if (!msg) msg = "Do nothing"
    return msg
  default:
    throw new Error("Unknow operation: " + odesc.type)
  }
}

/**
 * Returns an HTML div describing `signers`.
 *
 * @param {Object} signers Signers object as returned by @see{resolve.signers}.
 * @return {HTMLElement} Signers HTML description
 */
format.signatures = function (conf, transaction) {
  const signersNode = html.create("div", ".cosmiclib_signersNode")

  signersUtils.for(conf, transaction).then(utils => {
    if (utils.signersList.length < 2 && !utils.signatures.length) return

    utils.sources.forEach(accountId => {
      if (accountId !== specs.neutralAccountId) {
        const div = makeAccountSignersNode(conf, utils, accountId)
        html.append(signersNode, div)
      }
    })
  })

  return signersNode
}

function makeAccountSignersNode (conf, utils, accountId) {
  const accountSignersNode = html.create("div")

  const title = "Signers for " + misc.shorter(accountId)
  const titleNode = html.create("span", ".cosmiclib_threshold", title)
  const listNode = html.create("ul", ".cosmiclib_signers")
  html.append(accountSignersNode, titleNode, listNode)

  utils.signers[accountId].forEach(signer => {
    const signerNode = format.signer(conf, signer)
    const lineNode = html.create("li", null, signerNode)
    if (utils.hasSigned(signer.key)) {
      html.addClass(lineNode, "cosmiclib_signed")
      listNode.insertBefore(lineNode, listNode.firstChild)
    } else {
      html.append(listNode, lineNode)
    }
  })

  return accountSignersNode
}

/**
 * Retrieves the parent odesc (*Operation Descriptor*) of an HTML element, or
 * returns `undefined` if **element** is not the child of an HTML formatted
 * operation.
 *
 * @param {HTMLElement} element
 * @return {Object} odesc
 */
format.parentOdesc = (conf, element) => parentProperty(element, "odesc")

/**
 * Retrieves the parent operation index of an HTML element, or returns
 * `undefined` if **element** is not the child of an HTML formatted operation.
 *
 * @param {HTMLElement} element
 * @return {Number} operation index
 */
format.parentIndex = (conf, element) => parentProperty(element, "index")

/**
 * Retrieves the parent tdesc of an HTML element, or returns `undefined`
 * if **element** is not the child of an HTML formatted transaction.
 *
 * @param {HTMLElement} element
 * @return {Object} tdesc
 */
format.parentTdesc = (conf, element) => parentProperty(element, "tdesc")

function parentProperty (element, property) {
  while (element.parentNode) {
    if (element.parentNode[property]) return element.parentNode[property]
    else element = element.parentNode
  }
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
  if (!type) throw new Error("Unknow field: " + field)

  const domNode = format.type(conf, type, value)
  domNode.field = field
  if (field !== type) html.addClass(domNode, "cosmiclib_" + field)

  return domNode
}

format.type = function (conf, type, value) {
  if (typeof value === "object" && value.error) type = "error"
  const formatter = process[type] || process.string
  const domNode = formatter(conf, value)
  html.addClass(domNode, "cosmiclib_" + type)

  const eventObject = {
    conf: conf,
    type: type,
    value: value,
    domNode: domNode
  }
  if (conf.constructor.name === "CosmicLink") eventObject.cosmicLink = conf
  if (event.defaultClickHandlers[type]) {
    domNode.onclick = () => event.callClickHandler(conf, type, eventObject)
    html.addClass(domNode, "cosmiclib_clickable")
  }
  return domNode
}

/// Provide a format method for each data type.
specs.types.forEach(type => {
  format[type] = (conf, value) => format.type(conf, type, value)
})

/******************************************************************************/

const process = {}

process.string = function (conf, string) {
  if (typeof string !== "string") string = string + ""
  return html.create("span", null, string)
}

process.error = function (conf, errDesc) {
  const errorNode = html.create("span", ".cosmiclib_error")
  errorNode.textContent =
    errDesc.value === "" ? "(undefined)" : errDesc.value.value || errDesc.value
  errorNode.title = errDesc.error.message
  return errorNode
}

process.address = function (conf, address) {
  const addressNode = html.create(
    "span",
    { title: "Resolving..." },
    misc.shorter(address),
    html.create("span", ".cosmiclib_loadingAnim")
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
    html.addClass(addressNode, "cosmiclib_error")
  }

  const animation = html.grab(".cosmiclib_loadingAnim", addressNode)
  if (animation) html.destroy(animation)
}

process.amount = function (conf, amount, significant = 3, max = 7) {
  // Hide non-significant numbers
  if (typeof amount !== "number") amount = Number(amount)
  const nicified = nice(amount, { significant, max })
  if (String(amount).length <= nicified.length) {
    return html.create("span", null, nicified)
  } else {
    return html.create(
      "span",
      { className: "cosmiclib_clickable", title: amount },
      html.create("span", ".cosmiclib_tilde", "~"),
      nicified
    )
  }
}

process.asset = function (conf, asset) {
  const assetNode = html.create(
    "span",
    null,
    format.field(conf, "assetCode", asset.code)
  )

  if (asset.issuer) {
    html.append(
      assetNode,
      " (",
      format.field(conf, "assetIssuer", asset.issuer),
      ")"
    )
  }

  return assetNode
}

process.assetsArray = function (conf, assetsArray) {
  const assetsArrayNode = html.create("span")
  for (let i = 0; i < assetsArray.length; i++) {
    if (i !== 0) html.append(assetsArrayNode, ", ")
    html.append(assetsArrayNode, format.asset(conf, assetsArray[i]))
  }

  return assetsArrayNode
}

process.buffer = function (conf, object) {
  if (object.type === "base64") return format.hash(conf, object.value)
  else return format.string(conf, object.value)
}

process.date = function (conf, date) {
  return html.create("span", {}, new Date(date).toLocaleString())
}

process.hash = function (conf, hash) {
  return html.create("span", { title: hash }, misc.shorter(hash))
}

process.id = process.hash

process.flags = function (conf, flags) {
  let string = ""
  if (flags >= 4) {
    string = "immutable"
    flags = flags - 4
  }
  if (flags >= 2) {
    if (string) string = ", " + string
    string = "revocable" + string
    flags = flags - 2
  }
  if (+flags === 1) {
    if (string) string = ", " + string
    string = "required" + string
  }

  return html.create("span", {}, string)
}

process.memo = function (conf, memo) {
  const typeNode = format.field(conf, "memoType", memo.type)
  let valueNode
  switch (memo.type) {
  case "text":
    valueNode = format.field(conf, "memoText", memo.value)
    break
  case "base64":
    valueNode = format.field(conf, "memoBinary", memo.value)
    break
  case "id":
    valueNode = format.field(conf, "memoId", memo.value)
    break
  case "hash":
    valueNode = format.field(conf, "memoHash", memo.value)
    break
  case "return":
    valueNode = format.field(conf, "memoReturn", memo.value)
  }
  return html.create("span", {}, valueNode, " (", typeNode, ")")
}

process.price = function (conf, price) {
  if (typeof price === "string") return process.amount(conf, price, 3, null)
  else return process.amount(conf, price.n / price.d, 3, null)
}

process.signer = function (conf, signer) {
  const signerNode = html.create("span")
  switch (signer.type) {
  case "key":
  case "ed25519_public_key": {
    const value1 = signer.value || signer.key
    html.append(
      signerNode,
      "Account ",
      format.field(conf, "signerKey", value1)
    )
    break
  }
  case "tx": {
    const value2 = signer.value || signer.key
    html.append(
      signerNode,
      "transaction ",
      format.field(conf, "signerTx", value2)
    )
    break
  }
  case "hash":
  case "sha256hash": {
    const value3 =
        signer.value
        || StellarSdk.StrKey.decodeSha256Hash(signer.key).toString("hex")
    html.append(
      signerNode,
      "key whose hash is ",
      format.field(conf, "signerHash", value3)
    )
    break
  }
  }
  if (signer.weight > 1) {
    const weightNode = format.weight(conf, signer.weight)
    html.append(signerNode, " (weight: ", weightNode, ")")
  }
  return signerNode
}
