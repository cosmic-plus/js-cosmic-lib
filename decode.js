'use strict'
/**
 * Decode fields values from URI to cosmic link JSON format. This format differs
 * from Stellar transaction format: it is simpler, allow for federated address
 * and can be stringified/parsed without loss of information.
 *
 * For each of those functions, any error is recorded in the `cosmicLink` object
 * and HTML nodes are updated accordingly.
 *
 * @exports decode
 */
const decode = exports

const helpers = require('./helpers')
const status = require('./status')
const check = require('./check')
const specs = require('./specs')

/**
 * Decode `value` accordingly to `field` type.
 *
 * @param {cosmicLink} cosmicLink
 * @param {string} field
 * @param {string} value
 */
decode.field = function (cosmicLink, field, value) {
  const type = specs.fieldType[field]
  value = decodeURIComponent(value)
  if (type) return decode.type(cosmicLink, type, value)
  /// This error will be handled latter in convert.queryToTdesc()
  else throw ''
}

/**
 * Decode `value` using the decoding function for `type`.
 *
 * @param {cosmicLink} cosmicLink
 * @param {string} type
 * @param {string} value
 */
decode.type = function (cosmicLink, type, value) {
  check.type(cosmicLink, type)
  const decoder = decode[type]
  if (decoder) value = decoder(cosmicLink, value)
  check.type(cosmicLink, type, value)
  return value
}

/******************************************************************************/

decode.asset = function (cosmicLink, asset) {
  const assetLower = asset.toLowerCase()
  if (assetLower === 'xlm' || assetLower === 'native') {
    return { code: 'XLM' }
  } else {
    const temp = asset.split(':')
    const object = { code: temp[0], issuer: temp[1] }
    return object
  }
}

decode.assetsArray = function (cosmicLink, assetsList) {
  const strArray = assetsList.split(',')
  return strArray.map(entry => decode.asset(cosmicLink, entry))
}

decode.boolean = function (cosmicLink, string) {
  switch (string) {
    case 'true': return true
    case 'false': return false
  }
}

decode.date = function (cosmicLink, string) {
  const timeStamp = Date.parse(string)
  if (isNaN(timeStamp)) {
    status.error(cosmicLink, 'Invalid date (expecting ISO format): ' + string, 'throw')
  }
  return timeStamp / 1000
}

decode.memo = function (cosmicLink, memo) {
  const type = memo.replace(/:.*/, '')
  const value = memo.replace(/^[^:]*:/, '')
  if (type === value) {
    return { type: 'text', value: value }
  } else {
    return { type: type, value: value }
  }
}

decode.price = function (cosmicLink, price) {
  const numerator = price.replace(/:.*/, '')
  const denominator = price.replace(/^[^:]*:/, '')
  if (numerator === denominator) return price
  else return { n: +numerator, d: +denominator }
}

decode.signer = function (cosmicLink, signer) {
  const temp = signer.split(':')
  if (temp.length > 3) {
    status.error(cosmicLink,
      'Invalid signer: ' + helpers.shorter(signer),
      'throw'
    )
  }
  const object = { weight: temp[0], type: temp[1], value: temp[2] }
  return object
}
