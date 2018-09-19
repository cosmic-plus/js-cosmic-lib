'use_strict'
/**
 * Methods to set tdesc/odesc defaults values and strip out useless data.
 *
 * @exports normalize
 * @private
 */
const normalize = exports

const StellarSdk = require('@cosmic-plus/base/stellar-sdk')

/**
 * Setup the default values for `tdesc`.
 */
normalize.tdesc = function (conf, tdesc) {
  if (!tdesc.operations) tdesc.operations = []

  if (tdesc.fee === 100 * tdesc.operations.length) delete tdesc.fee
  dateFields.forEach(field => {
    if (tdesc[field]) {
      tdesc[field] = normalize.date(conf, tdesc[field])
      if (tdesc[field] === '1970') delete tdesc[field]
    }
  })
}

const dateFields = ['minTime', 'maxTime']

normalize.date = function (conf, date) {
  return date.replace(/:00\.000/, '').replace(/\.000/, '')
    .replace(/T00:00Z/, '').replace(/-01$/, '').replace(/-01$/, '')
}

/**
 * Add the implicit values for fields made optional in the CosmicLink protocol
 * but required by StellarSdk.
 */
normalize.odesc = function (conf, odesc) {
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
      if (!odesc.value) odesc.value = null
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
