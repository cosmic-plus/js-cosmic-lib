'use strict'
/**
 * Contains the methods to encode values formatted in `transaction descriptor`
 * format into URI format.
 *
 * @exports encode
 */
const encode = exports

const check = require('./check')
const specs = require('./specs')


/**
 * Encode `value` into cosmic link query format and return
 * `&${field}=${encodedValue}`
 *
 * @param {CL}
 * @param {string} field
 * @param {*} value `value` should use cosmic link JSON format
 * @return {string}
 */
encode.field = function (cosmicLink, field, value) {
  const type = specs.fieldType[field]
  if (!type) status.error(cosmicLink, 'Unknow field: ' + field, 'throw')
  if (value === undefined) return ''
  const encodedValue = encode.type(cosmicLink, type, value)
  if (encodedValue === '' && field !== 'homeDomain') return ''
  else return `&${field}=${encodedValue}`
}

/**
 * Encode `value` into cosmic link query format according to `type`.
 *
 * @param {CL}
 * @param {string} field
 * @param {*} value `value` should use cosmic link JSON format
 * @return {string}
 */
encode.type = function (cosmicLink, type, value) {
  check.type(cosmicLink, type)
  if (value === undefined) return ''
  const encoder = encode[type]
  if (typeof value === 'string') value = encodeURIComponent(value)
  if (encoder) value = encoder (cosmicLink, value)
  if (value === undefined) return ''
  else return value
}

/******************************************************************************/

encode.asset = function (cosmicLink, asset) {
  if (asset.issuer) return encodeURIComponent(asset.code) + ':' + encodeURIComponent(asset.issuer)
}

encode.assetsArray = function (cosmicLink, assetsArray) {
  return assetsArray.map(asset => encode.asset(cosmicLink, asset)).toString()
}

encode.boolean = function (cosmicLink, boolean) {
  if (boolean === 'false' || !boolean) return 'false'
}

encode.date = function (cosmicLink, timestamp) {
  const date = new Date(timestamp * 1000)
  const isoString = date.toISOString()
    .replace(/\.00.000/, '')
    .replace(/\.000/, '')
    .replace(/T00:00:00Z/, '')
  return isoString
}

encode.memo = function (cosmicLink, memo) {
  if (memo.type === 'text') return encodeURIComponent(memo.value)
  else return memo.type + ':' + encodeURIComponent(memo.value)
}

encode.signer = function (cosmicLink, signer) {
  return signer.weight + ':' + signer.type + ':' + signer.value
}
