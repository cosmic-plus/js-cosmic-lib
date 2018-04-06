'use strict'

import {shorter} from './helpers'
import * as status from './status'
import * as check from './check'
import * as specs from './specs'

/**
 * Decode fields values from URI to cosmic link JSON format. This format differs
 * from Stellar transaction format: it is simpler, allow for federated address
 * and can be stringified/parsed without loss of information.
 *
 * For each of those functions, any error is recorded in the `cosmicLink` object
 * and HTML nodes are updated accordingly.
 *
 * @module
 */

/**
 * Decode `value` accordingly to `field` type.
 *
 * @param {cosmicLink} cosmicLink
 * @param {string} field
 * @param {string} value
 */
export function fieldValue (cosmicLink, field, value) {
  const type = specs.fieldType[field]
  const decodedValue = decodeURIComponent(value)
  if (type) return typedValue(cosmicLink, type, decodedValue)
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
export function typedValue (cosmicLink, type, value) {
  const decoder = exports[type]
  if (decoder) return decoder(cosmicLink, value)
  else return value
}

/******************************************************************************/

/**
 * Decode `amount` to cosmic link format.
 *
 * @param [cosmicLink] cosmicLink
 * @param [string] amount
 * @return [string]
 */
export function amount (cosmicLink, amount) {
  check.amount(cosmicLink, amount)
  return amount
}

/**
 * Decode `asset` to cosmic link format: { code: c, issuer: i }.
 *
 * @param [cosmicLink] cosmicLink
 * @param [string] asset Either 'code:issuer', 'native' or 'XLM'
 * @return [Object]
 */
export function asset (cosmicLink, asset) {
  const assetLower = asset.toLowerCase()
  if (assetLower === 'xlm' || assetLower === 'native') {
    return { code: 'XLM' }
  } else {
    const temp = asset.split(':')
    const object = { code: temp[0], issuer: temp[1] }
    check.asset(cosmicLink, object)
    return object
  }
}

/**
 * Decode `assetList` to cosmic link format.
 *
 * @param [cosmicLink] cosmicLink
 * @param [string] assetsList Assets in URI format separated by comas
 * @return [Object]
 */
export function assetsArray (cosmicLink, assetsList) {
  const strArray = assetsList.split(',')
  let assetsArray = []
  let isValid = true

  strArray.forEach(value => {
    try {
      const parsedAsset = asset(cosmicLink, value)
      assetsArray.push(parsedAsset)
    } catch (error) {
      console.log(error)
      isValid = false
    }
  })

  if (!isValid) status.error(cosmicLink, 'Invalid asset path', 'throw')
  return assetsArray
}

/**
 * Convert `string` to corresponding boolean.
 *
 * @param {cosmicLink} cosmicLink
 * @param {string} string boolean
 * @return {boolean}
 */
export function boolean (cosmicLink, string) {
  switch (string) {
    case 'true': return true
    case 'false': return false
    default: status.error(cosmicLink, 'Invalid boolean: ' + string, 'throw')
  }
}

/**
 * Convert an ISO 8601 formatted date string to the UNIX timestamp format used
 * in Stellar transactions.
 *
 * @param {cosmicLink} cosmicLink
 * @param {string} string ISO 8601 date
 * @return {timestamp}
 */
export function date (cosmicLink, string) {
  const timeStamp = Date.parse(string)
  if (isNaN(timeStamp)) {
    status.error(cosmicLink, 'Invalid date (expecting ISO format): ' + string, 'throw')
  }
  return timeStamp / 1000
}

/**
 * Convert a string encoded `memo` (i.e. 'type:value') to an equivalent object
 * using cosmic link representation.
 *
 * @param {cosmicLink} cosmicLink
 * @param {string} memo
 * @return {object} JSON memo representation
 */
export function memo (cosmicLink, memo) {
  const type = memo.replace(/:.*/, '')
  const value = memo.replace(/^[^:]*:/, '')
  if (type === value) {
    status.error(cosmicLink, 'Missing memo type: ' + memo, 'throw')
  } else {
    return { type: type, value: value }
  }
}

/**
 * Convert a `price` string to an equivalent object in cosmic link
 * representation, which is a string representing a number or a
 * { n: nominator, d: denominator } couple.
 *
 * @param {cosmicLink} cosmicLink
 * @param {string} price
 * @return {string|object} JSON-compatible price object
 */
export function price (cosmicLink, price) {
  const numerator = price.replace(/:.*/, '')
  const denominator = price.replace(/^[^:]*:/, '')
  if (numerator === denominator) {
    return amount(cosmicLink, numerator)
  } else {
    const object = {}
    object.n = +amount(cosmicLink, numerator)
    object.d = +amount(cosmicLink, denominator)
    return object
  }
}

/**
 * Return a JSON-compatible represention of string-formatted `signer`.
 * String format for `signer` is 'weight,type:value'.
 * Object format is { weight: 'w', type: 't', value: 'v' }
 *
 * @param {cosmicLink} cosmicLink
 * @param {string} signer
 * @return {object}
 */
export function signer (cosmicLink, signer) {
  const temp = signer.split(':')
  if (temp.length > 3) {
    status.error(cosmicLink, 'Invalid signer: ' + shorter(signer), 'throw')
  }

  const weight = temp[0]
  const type = temp[1]
  const value = temp[2]
  const object = { type: type, value: value, weight: weight }

  check.signer(cosmicLink, object)
  return object
}
