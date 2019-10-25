"use strict"
/**
 * Methods to set tdesc/odesc defaults values and strip out useless data.
 *
 * @exports normalize
 * @private
 */
const normalize = exports

const StellarSdk = require("@cosmic-plus/base/es5/stellar-sdk")

const config = require("./config")
const resolve = require("./resolve")
const specs = require("./specs")

/**
 * Setup the default values for `tdesc`.
 */
normalize.tdesc = function (conf, tdesc) {
  removeEmptyFields(tdesc)
  if (!tdesc.operations) tdesc.operations = []

  if (tdesc.fee === 100 * tdesc.operations.length) delete tdesc.fee
  dateFields.forEach(field => {
    if (tdesc[field]) {
      tdesc[field] = normalize.date(conf, tdesc[field])
      if (tdesc[field] === "1970") delete tdesc[field]
    }
  })

  if (tdesc.network) tdesc.network = normalize.network(conf, tdesc.network)

  // When network is neither test nor public, we want to provide a fallback
  // Horizon URL; else we don't need it.
  if (tdesc.network && tdesc.network !== "public" && tdesc.network !== "test") {
    const url = resolve.horizon(config, tdesc.network) || tdesc.horizon
    tdesc.horizon = normalize.url(conf, url)
  } else {
    delete tdesc.horizon
  }

  if (tdesc.callback) tdesc.callback = normalize.url(conf, tdesc.callback)
}

const dateFields = ["minTime", "maxTime"]

normalize.date = function (conf, date) {
  if (date.match(/^\+[0-9]+$/)) {
    const shifted = new Date()
    shifted.setMinutes(shifted.getMinutes() + +date.substr(1))
    date = shifted.toISOString().replace(/\.[0-9]{3}/, "")
  }
  return date
    .replace(/:00\.000/, "")
    .replace(/\.000/, "")
    .replace(/T00:00Z/, "")
    .replace(/-01$/, "")
    .replace(/-01$/, "")
}

normalize.network = function (conf, network) {
  const networkName = resolve.networkName(conf, network)
  if (networkName === "public" || networkName === "test") {
    return networkName
    // In network is neither test nor public, we want to use the network
    // passphrase as parameter to ensure cross-wallet compatibility.
  } else {
    return resolve.networkPassphrase(conf, network)
  }
}

normalize.url = function (conf, url) {
  if (url) return url.substr(0, 4) === "http" ? url : "https://" + url
}

/**
 * Add the implicit values for fields made optional in the CosmicLink protocol
 * but required by StellarSdk.
 */
normalize.odesc = function (conf, odesc) {
  removeEmptyFields(odesc)
  /// No limit = maximum limit.
  if (odesc.limit === "922337203685.4775807") delete odesc.limit
  /// New offer.
  if (odesc.offerId === "0") delete odesc.offerId
  /// Empty asset conversion path.
  if (odesc.path && !odesc.path.length) delete odesc.path
  /// Useless denominator.
  if (odesc.price && odesc.price.d === 1) odesc.price = odesc.price.n + ""

  switch (odesc.type) {
  case "allowTrust":
    /// Allow trust by default.
    if (odesc.authorize === undefined) odesc.authorize = true
    break
  case "createPassiveOffer":
  case "manageOffer":
    /// Protocol 11 update renamed those operations.
    if (odesc.type === "manageOffer") odesc.type = "manageSellOffer"
    else odesc.type = "createPassiveSellOffer"
    // Fall Through
  case "createPassiveSellOffer":
  case "manageBuyOffer":
  case "manageSellOffer":
    /// Syntactic sugar for offer deletion
    if (odesc.offerId && (odesc.amount === "0" || odesc.buyAmount === "0")) {
      if (!odesc.buying && !odesc.selling) {
        odesc.buying = new StellarSdk.Asset("XLM", specs.neutralAccountId)
      }
      if (!odesc.price) odesc.price = "1"
    }
    /// XLM as default asset.
    if (odesc.buying && !odesc.selling) odesc.selling = XLM
    if (odesc.selling && !odesc.buying) odesc.buying = XLM
    break
  case "manageData":
    /// Delete data entry.
    if (!odesc.value) odesc.value = ""
    break
  case "pathPayment":
    /// Protocol 12 update renamed this operation.
    odesc.type = "pathPaymentStrictReceive"
    // Fall Through
  case "pathPaymentStrictReceive":
    /// XLM as default asset.
    if (odesc.destAsset && !odesc.sendAsset) odesc.sendAsset = XLM
    if (odesc.sendAsset && !odesc.destAsset) odesc.destAsset = XLM
    break
  case "payment":
    /// XLM as default asset.
    if (!odesc.asset) odesc.asset = XLM
    break
  }
}

const XLM = StellarSdk.Asset.native()

function removeEmptyFields (object) {
  for (let field in object) {
    if (object[field] === null || object[field] === undefined)
      delete object[field]
  }
}
