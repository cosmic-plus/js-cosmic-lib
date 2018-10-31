'use_strict'
/**
 * Methods to set tdesc/odesc defaults values and strip out useless data.
 *
 * @exports normalize
 * @private
 */
const normalize = exports

const StellarSdk = require('@cosmic-plus/base/stellar-sdk')

const resolve = require('./resolve')

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
      if (tdesc[field] === '1970') delete tdesc[field]
    }
  })

  if (tdesc.network) {
    if (tdesc.network === StellarSdk.Networks.TESTNET) tdesc.network = 'test'
    else if (tdesc.network === StellarSdk.Networks.PUBLIC) tdesc.network = 'public'
  }

  if (tdesc.horizon) {
    if (!tdesc.network || tdesc.network === 'public' || tdesc.network === 'test') {
      delete tdesc.horizon
    } else if (tdesc.horizon.substr(0, 8) === 'https://') {
      tdesc.horizon = tdesc.horizon.substr(8)
    }
  }
}

const dateFields = ['minTime', 'maxTime']

normalize.date = function (conf, date) {
  return date.replace(/:00\.000/, '').replace(/\.000/, '')
    .replace(/T00:00Z/, '').replace(/-01$/, '').replace(/-01$/, '')
}

normalize.network = function (conf, network) {
  return resolve.networkName(conf, network) || network
}

/**
 * Add the implicit values for fields made optional in the CosmicLink protocol
 * but required by StellarSdk.
 */
normalize.odesc = function (conf, odesc) {
  removeEmptyFields(odesc)
  /// No limit = maximum limit.
  if (odesc.limit === '922337203685.4775807') delete odesc.limit
  /// New offer.
  if (odesc.offerId === '0') delete odesc.offerId
  /// Empty asset conversion path.
  if (odesc.path && !odesc.path.length) delete odesc.path
  /// Useless denominator.
  if (odesc.price && odesc.price.d === 1) odesc.price = odesc.price.n + ''

  switch (odesc.type) {
    case 'allowTrust':
      /// Allow trust by default.
      if (odesc.authorize === undefined) odesc.authorize = true
      break
    case 'createPassiveOffer':
    case 'manageOffer': {
      /// XLM as default asset.
      if (odesc.buying && !odesc.selling) odesc.selling = XLM
      if (odesc.selling && !odesc.buying) odesc.buying = XLM
      break
    }
    case 'manageData':
      /// Delete data entry.
      if (!odesc.value) odesc.value = ''
      break
    case 'pathPayment':
      /// XLM as default asset.
      if (odesc.destAsset && !odesc.sendAsset) odesc.sendAsset = XLM
      if (odesc.sendAsset && !odesc.destAsset) odesc.destAsset = XLM
      break
    case 'payment':
      /// XLM as default asset.
      if (!odesc.asset) odesc.asset = XLM
      break
  }
}

const XLM = StellarSdk.Asset.native()

function removeEmptyFields (object) {
  for (let field in object) {
    if (object[field] === null || object[field] === undefined) delete object[field]
  }
}
