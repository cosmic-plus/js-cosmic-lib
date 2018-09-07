'use strict'
/**
 * Decode fields values from URI to cosmic link JSON format. This format differs
 * from Stellar transaction format: it is simpler, allow for federated address
 * and can be stringified/parsed without loss of information.
 *
 * For each of those functions, any error is recorded in the `conf` object
 * and HTML nodes are updated accordingly.
 *
 * @private
 * @exports decode
 */
const decode = exports

const check = require('./check')
const specs = require('./specs')
const status = require('./status')

const helpers = require('ticot-box/misc')


/**
 * Decode `value` accordingly to `field` type.
 *
 * @param {string} field
 * @param {string} value
 */
decode.field = function (conf, field, value) {
  const type = specs.fieldType[field]
  value = decodeURIComponent(value)
  if (type) return decode.type(conf, type, value)
  /// This error will be handled latter in convert.queryToTdesc()
  else throw ''
}

/**
 * Decode `value` using the decoding function for `type`.
 *
 * @param {string} type
 * @param {string} value
 */
decode.type = function (conf, type, value) {
  check.type(conf, type)
  const decoder = decode[type]
  if (decoder) value = decoder(conf, value)
  check.type(conf, type, value)
  return value
}

/******************************************************************************/

decode.asset = function (conf, asset) {
  const assetLower = asset.toLowerCase()
  if (assetLower === 'xlm' || assetLower === 'native') {
    return { code: 'XLM' }
  } else {
    const temp = asset.split(':')
    const object = { code: temp[0], issuer: temp[1] }
    return object
  }
}

decode.assetsArray = function (conf, assetsList) {
  const strArray = assetsList.split(',')
  return strArray.map(entry => decode.asset(conf, entry))
}

decode.boolean = function (conf, string) {
  switch (string) {
    case 'true': return true
    case 'false': return false
  }
}

decode.date = function (conf, string) {
  const timeStamp = Date.parse(string)
  if (isNaN(timeStamp)) {
    status.error(conf, 'Invalid date (expecting ISO format): ' + string, 'throw')
  }
  return timeStamp / 1000
}

decode.memo = function (conf, memo) {
  const type = memo.replace(/:.*/, '')
  const value = memo.replace(/^[^:]*:/, '')
  if (type === value) {
    return { type: 'text', value: value }
  } else {
    return { type: type, value: value }
  }
}

decode.price = function (conf, price) {
  const numerator = price.replace(/:.*/, '')
  const denominator = price.replace(/^[^:]*:/, '')
  if (numerator === denominator) return price
  else return { n: +numerator, d: +denominator }
}

decode.signer = function (conf, signer) {
  const temp = signer.split(':')
  if (temp.length > 3) {
    status.error(conf,
      'Invalid signer: ' + helpers.shorter(signer),
      'throw'
    )
  }
  const object = { weight: temp[0], type: temp[1], value: temp[2] }
  return object
}
