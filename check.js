'use strict'

import * as status from './status'
import * as specs from './specs'

/**
 * Provide checks for varous type of field used in cosmic links. In case of
 * error, `cosmicLink` is updated accordingly.
 *
 * This module may no be type-complete and new type checks got added only when
 * needed.
 *
 * The check apply on values using the cosmic link JSON format.
 *
 * @module
 */

/**
 * Generic check for numbers. Check that `value` is a number or a string
 * representing a number. `type` is for the customization of the message in case
 * of error. `min` and `max` may be provided as additional restriction for
 * `value`.
 *
 * @param {cosmicLink} cosmicLink
 * @param {number|string} value
 * @param {string} [type = 'number']
 * @param {number|string} [min]
 * @param {number|string} [max]
 */
export function number (cosmicLink, value, type = 'number', min, max) {
  const num = +value
  if (isNaN(num)) {
    status.error(cosmicLink, 'Invalid ' + type + ' (should be a number): ' +
        value, 'throw')
  } else if ((min && num < min) || (max && num > max)) {
    status.error(cosmicLink, 'Invalid ' + type +
      ' (should be between ' + min + ' and ' + max + ' ): ' + value, 'throw')
  }
}

/**
 * Check that `value` respect the cosmic link JSON format for `field`.
 *
 * @param {cosmicLink} cosmicLink
 * @param {string} field
 * @param {string} value
 */
export function fieldValue (cosmicLink, field, value) {
  const type = specs.fieldType[field]
  if (type) typedValue(cosmicLink, type, value)
  else status.error(cosmicLink, 'Unknow field: ' + field, 'throw')
}

/**
 * Check that `value` respect the cosmic link JSON format for `type`.
 *
 * @param {cosmicLink} cosmicLink
 * @param {string} type
 * @param {string} value
 */
export function typedValue (cosmicLink, type, value) {
  const checker = exports[type]
  if (checker) checker(cosmicLink, value)
}

/******************************************************************************/

/**
 * @param {cosmicLink} cosmicLink
 * @param {object} asset
 */
export function asset (cosmicLink, asset) {
  const code = asset.code.toLowerCase()
  if (!asset.issuer && code !== 'xlm' && code !== 'native') {
    status.error(cosmicLink, 'Missing issuer for asset: ' + code, 'throw')
  }
}

/**
 * @param {cosmicLink} cosmicLink
 * @param {string|number} amount
 */
export function amount (cosmicLink, amount) {
  number(cosmicLink, amount, 'amount')
}

/**
 * @param {cosmicLink} cosmicLink
 * @param {object} signer
 */
export function signer (cosmicLink, signer) {
  number(cosmicLink, signer.weight, 'weight', 0, 255)
  switch (signer.type) {
    case 'key': break
    case 'hash':
    case 'tx':
      if (signer.value.length !== 64 || !signer.value.match(/[0-9a-f]*/)) {
        status.error(cosmicLink, 'Invalid hash (expecting sha256sum)', 'throw')
      }
      break
    default:
      status.error(cosmicLink, 'Invalid signer type: ' + signer.type, 'throw')
  }
}

/**
 * @param {cosmicLink} cosmicLink
 * @param {string|number} threshold
 */
export function threshold (cosmicLink, threshold) {
  number(cosmicLink, threshold, 'threshold', 0, 255)
}

/**
 * @param {cosmicLink} cosmicLink
 * @param {string|number} weight
 */
export function weight (cosmicLink, weight) {
  number(cosmicLink, weight, 'weight', 0, 255)
}
