'use strict'

import * as specs from './specs'

/**
 * Contains the methods to encode values formatted in `transaction descriptor`
 * format into URI format.
 *
 * @module
 */

export function field (cosmicLink, field, value) {
  let result = value
  const type = specs.fieldType[field]
  if (type) {
    const encoder = exports[type]
    if (encoder) result = encoder(cosmicLink, value)
  }
  if (result === undefined) return ''
  else return '&' + field + '=' + result
}

/******************************************************************************/

export function asset (cosmicLink, asset) {
  if (asset.issuer) return asset.code + ':' + asset.issuer
}

export function assetsArray (cosmicLink, assetsArray) {
  let string = ''
  assetsArray.forEach(entry => {
    if (string) string = string + ','
    string = string + asset(cosmicLink, entry)
  })
  return string
}

export function boolean (cosmicLink, boolean) {
  if (!boolean) return 'false'
}

export function date (cosmicLink, timestamp) {
  const date = new Date(timestamp * 1000)
  const isoString = date.toISOString()
    .replace(/\.00.000/, '')
    .replace(/\.000/, '')
    .replace(/T00:00:00Z/, '')
  return isoString
}

export function memo (cosmicLink, memo) {
  return memo.type + ':' + memo.value
}

export function signer (cosmicLink, signer) {
  return signer.weight + ':' + signer.type + ':' + signer.value
}
