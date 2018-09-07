'use strict'
/**
 * Provide checks for varous type of field used in cosmic links.
 *
 * This module may no be type-complete and new type checks got added only when
 * needed.
 *
 * The check apply on values using the cosmic link JSON format.
 *
 * @private
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
 * @param {string} field
 * @param {string} [value]
 */
check.field = function (conf, field, value) {
  const type = specs.fieldType[field]
  if (!type) status.error(conf, 'Unknow field: ' + field, 'throw')
  if (value) check.type(conf, type, value)
}

/**
 * Check that `type` is a valid transaction/operation field type. If `value` is
 * given, check that it is valid for that `type`. If a check doesn't pass, an
 * error is throwed.
 *
 * @param {string} type
 * @param {string} [value]
 */
check.type = function (conf, type, value) {
  if (!specs.types.find(entry => entry === type)) {
    throw new Error('Invalid type: ' + type)
  }
  if (value) {
    check.type(conf, type)
    const checker = check[type]
    if (checker) checker(conf, value)
  }
}

/**
 * Generic check for numbers. Check that `value` is a number or a string
 * representing a number. `type` is for the customization of the message in case
 * of error. `min` and `max` may be provided as additional restriction for
 * `value`.
 *
 * @param {number|string} value
 * @param {string} [type = 'number']
 * @param {number|string} [min]
 * @param {number|string} [max]
 */
check.number = function (conf, value, type = 'number', min, max) {
  const num = +value
  if (isNaN(num)) {
    status.error(conf,
      `Invalid ${type} (should be a number): ${value}`,
      'throw'
    )
  } else if ((min && num < min) || (max && num > max)) {
    status.error(conf,
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
 * @param {number|string} value
 * @param {string} [type = 'integer']
 * @param {number|string} [min]
 * @param {number|string} [max]
 */
check.integer = function (conf, value, type = 'integer', min, max) {
  check.number(conf, value, type, min, max)
  if (parseInt(value) + '' !== value + '') {
    status.error(conf, `Not an integer: ${value}`, 'throw')
  }
}

/******************************************************************************/

check.asset = function (conf, asset) {
  const code = asset.code.toLowerCase()
  if (!asset.issuer && code !== 'xlm' && code !== 'native') {
    status.error(conf, 'Missing issuer for asset: ' + code, 'throw')
  }
}

check.assetsArray = function (conf, assetsArray) {
  let isValid = true
  for (let index in assetsArray) {
    try { check.asset(conf, assetsArray[index]) } catch (error) { isValid = false }
  }
  if (!isValid) throw new Error('Invalid assets array')
}

check.amount = function (conf, amount) {
  check.number(conf, amount, 'amount')
}

check.boolean = function (conf, boolean) {
  if (typeof boolean !== 'boolean') {
    status.error(conf, 'Invalid boolean: ' + boolean, 'throw')
  }
}

check.flags = function (conf, flags) {
  check.integer(conf, flags, 'flags', 0, 7)
}

check.price = function (conf, price) {
  if (typeof price === 'object') {
    try {
      check.price(null, price.n)
      check.price(null, price.d)
    } catch (error) {
      status.error(conf, 'Invalid price', 'throw')
    }
  } else {
    check.number(conf, price, 0)
  }
}

check.signer = function (conf, signer) {
  check.weight(conf, signer.weight)
  switch (signer.type) {
    case 'key': break
    case 'hash':
    case 'tx':
      if (signer.value.length !== 64 || !signer.value.match(/[0-9a-f]*/)) {
        status.error(conf, 'Invalid hash (expecting sha256sum)', 'throw')
      }
      break
    default:
      status.error(conf, 'Invalid signer type: ' + signer.type, 'throw')
  }
}

check.sequence = function (conf, sequence) {
  check.number(conf, sequence, 'sequence', 0)
}

check.threshold = function (conf, threshold) {
  check.integer(conf, threshold, 'threshold', 0, 255)
}

check.weight = function (conf, weight) {
  check.integer(conf, weight, 'weight', 0, 255)
}
