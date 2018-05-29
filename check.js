'use strict'
/**
 * Provide checks for varous type of field used in cosmic links. In case of
 * error, `cosmicLink` is updated accordingly.
 *
 * This module may no be type-complete and new type checks got added only when
 * needed.
 *
 * The check apply on values using the cosmic link JSON format.
 *
 * @exports check
 */
const check = exports

const specs = require('./specs')
const status = require('./status')


/**
 * Check that `field` is a valid transaction/operation field. If `value` is
 * given, check that it is valid for that `field`. If a check doesn't pass, an
 * error is throwed.
 *
 * @param {cosmicLink} cosmicLink
 * @param {string} field
 * @param {string} [value]
 */
check.field = function (cosmicLink, field, value) {
  const type = specs.fieldType[field]
  if (!type) status.error(cosmicLink, 'Unknow field: ' + field, 'throw')
  if (value) check.type(cosmicLink, type, value)
}

/**
 * Check that `type` is a valid transaction/operation field type. If `value` is
 * given, check that it is valid for that `type`. If a check doesn't pass, an
 * error is throwed.
 *
 * @param {cosmicLink} cosmicLink
 * @param {string} type
 * @param {string} [value]
 */
check.type = function (cosmicLink, type, value) {
  if (! specs.types.find(entry => entry === type)) {
    throw new Error('Invalid type: ' + type)
  }
  if (value) {
    check.type(cosmicLink, type)
    const checker = check[type]
    if (checker) checker(cosmicLink, value)
  }
}

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
check.number = function (cosmicLink, value, type = 'number', min, max) {
  const num = +value
  if (isNaN(num)) {
    status.error(cosmicLink,
      `Invalid ${type} (should be a number): ${value}`,
      'throw'
    )
  } else if ((min && num < min) || (max && num > max)) {
    status.error(cosmicLink,
      `Invalid ${type} (should be between ${min} and ${max} ): ${value}`,
      'throw'
    )
  }
}

/**
 * Generic check for integers. Check that `value` is an integer or a string
 * representing an integer. `type` is for the customization of the message in
 * case of error. `min` and `max` may be provided as additional restriction for
 * `value`.
 *
 * @param {cosmicLink} cosmicLink
 * @param {number|string} value
 * @param {string} [type = 'integer']
 * @param {number|string} [min]
 * @param {number|string} [max]
 */
check.integer = function (cosmicLink, value, type = 'integer', min, max) {
  check.number(cosmicLink, value, type, min, max)
  if (parseInt(value) + '' !== value + '') {
    status.error(cosmicLink, `Not an integer: ${value}`, 'throw')
  }
}

/******************************************************************************/

check.asset = function (cosmicLink, asset) {
  const code = asset.code.toLowerCase()
  if (!asset.issuer && code !== 'xlm' && code !== 'native') {
    status.error(cosmicLink, 'Missing issuer for asset: ' + code, 'throw')
  }
}

check.assetsArray = function (cosmicLink, assetsArray) {
  let isValid = true
  for (let index in assetsArray) {
    try { check.asset(cosmicLink, assetsArray[index]) }
    catch (error) { isValid = false }
  }
  if (!isValid) throw new Error ('Invalid assets array')
}

check.amount = function (cosmicLink, amount) {
  check.number(cosmicLink, amount, 'amount')
}

check.boolean = function (cosmicLink, boolean) {
  if (typeof boolean !== 'boolean') {
    status.error(cosmicLink, 'Invalid boolean: ' + boolean, 'throw')
  }
}

check.flags = function (cosmicLink, flags) {
  check.integer(cosmicLink, flags, 'flags', 0, 7)
}

check.price = function (cosmicLink, price) {
  if (typeof price === 'object') {
    try {
      check.price(null, price.n)
      check.price(null, price.d)
    } catch (error) {
      status.error(cosmicLink, 'Invalid price', 'throw')
    }
  } else {
    check.number(cosmicLink, price, 0)
  }
}

check.signer = function (cosmicLink, signer) {
  check.weight(cosmicLink, signer.weight)
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

check.sequence = function (cosmicLink, sequence) {
  check.integer(cosmicLink, sequence, 'sequence', 0)
}

check.threshold = function (cosmicLink, threshold) {
  check.integer(cosmicLink, threshold, 'threshold', 0, 255)
}

check.weight = function (cosmicLink, weight) {
  check.integer(cosmicLink, weight, 'weight', 0, 255)
}
