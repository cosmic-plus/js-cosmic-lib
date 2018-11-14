"use strict"
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

const helpers = require("@cosmic-plus/jsutils/misc")

const specs = require("./specs")
const status = require("./status")

check.tdesc = function (conf, tdesc) {
  for (let field in tdesc) {
    try {
      check.txField(conf, field, tdesc[field])
    } catch (error) {
      tdesc[field] = errDesc(error, tdesc[field])
    }
  }

  if (!tdesc.operations.length) {
    status.error(conf, "No operation")
  }
  if (tdesc.operations.length > 100) {
    status.error(conf, "Too much operations (max 100)")
  }

  tdesc.operations.forEach(odesc => {
    // eslint-disable-next-line no-empty
    try { check.odesc(conf, odesc) } catch (e) { }
  })

  if (conf.errors) {
    const error = new Error("Invalid tdesc")
    error.tdesc = tdesc
    throw error
  }
}

check.odesc = function (conf, odesc) {
  try {
    check.operationType(conf, odesc.type)
  } catch (error) {
    odesc.type = errDesc(error, odesc.type)
  }

  for (let field in odesc) {
    try {
      check.operationField(conf, odesc.type, field, odesc[field])
    } catch (error) {
      odesc[field] = errDesc(error, odesc[field])
    }
  }

  specs.operationMandatoryFields[odesc.type].forEach(field => {
    if (odesc[field] === undefined) {
      const error = new Error("Missing mandatory field: " + field)
      odesc[field] = errDesc(error)
      status.error(conf, error.message)
    }
  })

  if (conf.errors) throw new Error("Invalid odesc")
}

check.txField = function (conf, field, value) {
  if (field === "operations") return
  if (!specs.transactionOptionalFields.find(name => name === field)) {
    status.error(conf, "Invalid transaction field: " + field, "throw")
  }
  check.field(conf, field, value)
}

check.operationType = function (conf, type) {
  if (!specs.operationMandatoryFields[type]) {
    status.error(conf, "Invalid operation: " + type, "throw")
  }
}

check.operationField = function (conf, operation, field, value) {
  if (field === "type") return
  if (!specs.isOperationField(operation, field)) {
    status.error(conf, `Invalid field for ${operation}: ${field}`, "throw")
  }
  check.field(conf, field, value)
}

function errDesc (error, value = "") {
  return { error: error, value: value }
}

/******************************************************************************/

/**
 * Check that `field` is a valid transaction/operation field. If `value` is
 * given, check that it is valid for that `field`. If a check doesn't pass, an
 * error is throwed.
 *
 * @param {string} field
 * @param {string} [value]
 */
check.field = function (conf, field, value) {
  if (value === "" && field !== "homeDomain" && field !== "value") {
    status.error(conf, `Missing value for field: ${field}`, "throw")
  }

  const type = specs.fieldType[field]
  if (!type) status.error(conf, "Unknow field: " + field, "throw")
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
    throw new Error("Invalid type: " + type)
  }
  return check[type](conf, value)
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
check.number = function (conf, value, type = "number", min, max = "unlimited") {
  const num = +value
  if (isNaN(num)) {
    status.error(conf,
      `Invalid ${type} (should be a number): ${value}`,
      "throw"
    )
  } else if ((min && num < min) || (max && num > max)) {
    status.error(conf,
      `Invalid ${type} (should be between ${min} and ${max} ): ${value}`,
      "throw"
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
check.integer = function (conf, value, type = "integer", min, max) {
  check.number(conf, value, type, min, max)
  if (parseInt(value) + "" !== value + "") {
    status.error(conf, `Not an integer: ${value}`, "throw")
  }
}

/******************************************************************************/

check.amount = function (conf, amount) {
  check.number(conf, amount, "amount")
}

check.address = function (conf, address) {
  if (address.length !== 56 && !address.match(/.*\*.*\..*/)) {
    status.error(conf, "Invalid address: " + helpers.shorter(address), "throw")
  }
}

check.asset = function (conf, asset) {
  const code = asset.code.toLowerCase()
  if (!asset.issuer && code !== "xlm" && code !== "native") {
    status.error(conf, "Missing issuer for asset: " + code, "throw")
  }
}

check.assetsArray = function (conf, assetsArray) {
  let isValid = true
  for (let index in assetsArray) {
    try {
      check.asset(conf, assetsArray[index])
    } catch (error) {
      console.error(error)
      isValid = false
    }
  }
  if (!isValid) throw new Error("Invalid assets array")
}

check.boolean = function (conf, boolean) {
  if (typeof boolean !== "boolean") {
    status.error(conf, "Invalid boolean: " + boolean, "throw")
  }
}

check.date = function (conf, date) {
  if (isNaN(Date.parse(date))) {
    status.error(conf, "Invalid date: " + date, "throw")
  }
}

check.flags = function (conf, flags) {
  check.integer(conf, flags, "flags", 0, 7)
}

check.hash = function (conf, hash) {
  if (hash.length !== 64 || !hash.match(/[0-9a-f]*/)) {
    status.error(conf, "Invalid hash:" + hash, "throw")
  }
}

check.price = function (conf, price) {
  if (typeof price === "object") {
    try {
      check.price(null, price.n)
      check.price(null, price.d)
    } catch (error) {
      status.error(conf, "Invalid price: " + price, "throw")
    }
  } else {
    check.number(conf, price, "price", 0)
  }
}

check.signer = function (conf, signer) {
  check.weight(conf, signer.weight)
  switch (signer.type) {
  case "key":
    check.address(conf, signer.value)
    break
  case "hash":
  case "tx":
    check.hash(conf, signer.value)
    break
  default:
    status.error(conf, "Invalid signer type: " + signer.type, "throw")
  }
}

check.sequence = function (conf, sequence) {
  check.number(conf, sequence, "sequence", 0)
}

check.threshold = function (conf, threshold) {
  check.integer(conf, threshold, "threshold", 0, 255)
}

check.weight = function (conf, weight) {
  check.integer(conf, weight, "weight", 0, 255)
}

/******************************************************************************/

/**
 * Provide dummy aliases for every other type for convenience & backward
 * compatibility.
 */
specs.types.forEach(type => {
  if (!exports[type]) exports[type] = (conf, value) => value
})
