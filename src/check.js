"use strict"
/**
 * Exposes some of the check routines used by cosmic-lib. Individual type-checks
 * are also available for:
 *
 * > address, amount, asset, assetsArray, boolean, buffer, date, flags, hash,
 * id, memo, network, price, sequence, signer, string, threshold, url, weight
 *
 * All checks are meant to be used on tdesc formatted values. Form example, in
 * tdesc buffer values are not encoded as actual Buffer object but as something
 * like: `{ type: "text", value: "Hello World!"}`.
 *
 * @example
 * check.field("minTime", "2018-11")
 * check.date("2018-11")
 *
 * @private
 * @exports check
 */
const check = exports

const misc = require("@cosmic-plus/jsutils/es5/misc")

const specs = require("./specs")
const status = require("./status")

/**
 * Check that **tdesc** is valid.
 *
 * @example
 * check.tdesc({
 *   memo: { type: "text", value: "Hello, World!" },
 *   network: "public",
 *   source: "tips*cosmic.link",
 *   operations: [{ type: "setOptions", homeDomain: "cosmic.link" }]
 * })
 *
 * @param  {Object} tdesc
 */
check.tdesc = function (conf, tdesc) {
  let isValid = true

  for (let field in tdesc) {
    try {
      check.txField(conf, field, tdesc[field])
    } catch (error) {
      isValid = false
      tdesc[field] = errDesc(error, tdesc[field])
    }
  }

  if (tdesc.operations.length > 100) {
    isValid = false
    status.error(conf, "Too much operations (max 100)")
  }

  tdesc.operations.forEach((odesc) => {
    try {
      check.odesc(conf, odesc)
    } catch (e) {
      isValid = false
    }
  })

  if (!isValid) {
    const error = new Error("Invalid tdesc")
    // TODO: check if this is really useful
    error.tdesc = tdesc
    throw error
  }
}

/**
 * Check that tdesc operation is valid (referred as **odesc**).
 *
 * @example
 * check.odesc({ type: "payment", destination: "tips*cosmic.link", amount: "20" })
 *
 * @param  {Object} odesc [description]
 */
check.odesc = function (conf, odesc) {
  let isValid = true

  try {
    check.operationType(conf, odesc.type)
  } catch (error) {
    isValid = false
    odesc.type = errDesc(error, odesc.type)
  }

  for (let field in odesc) {
    try {
      check.operationField(conf, odesc.type, field, odesc[field])
    } catch (error) {
      isValid = false
      odesc[field] = errDesc(error, odesc[field])
    }
  }

  specs.operationMandatoryFields[odesc.type].forEach((field) => {
    if (odesc[field] === undefined) {
      isValid = false
      const error = new Error("Missing mandatory field: " + field)
      odesc[field] = errDesc(error)
      status.error(conf, error.message)
    }
  })

  if (!isValid) throw new Error("Invalid odesc")
}

/**
 * Check that **field** is a valid transaction field and that its **value** is
 * valid.
 *
 * @param  {string} field
 * @param  {*} value
 */
check.txField = function (conf, field, value) {
  if (field === "operations") return
  if (!specs.transactionOptionalFields.find((name) => name === field)) {
    status.error(conf, "Invalid transaction field: " + field, "throw")
  }
  check.field(conf, field, value)
}

/**
 * Check that **type** is a valid Stellar Operation type.
 *
 * @param  {String}
 */
check.operationType = function (conf, type) {
  if (!specs.operationMandatoryFields[type]) {
    status.error(conf, "Invalid operation: " + type, "throw")
  }
}

/**
 * Check that **field** is a valid **operation** field and that its **value** is
 * valid.
 *
 * @param {String} operation
 * @param {String} field
 * @param {*} value
 */
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
 * Check that **field** **value** is a valid.
 *
 * @example
 * check.field("memo", { type: "text", value: "Hello, World!" })
 *
 * @param {string} field The name of a Stellar Transaction parameter
 * @param {*} value
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
 * Check that **value** is of type **type**.
 *
 * @example
 * check.type("date", "2018-11-28")
 *
 * @param {string} type
 * @param {string} value
 */
check.type = function (conf, type, value) {
  if (!specs.types.find((entry) => entry === type)) {
    throw new Error("Invalid type: " + type)
  }
  return check[type](conf, value)
}

/**
 * Generic check for numbers. Check that **value** is a number or a string
 * representing a number. **type** is for the customization of the message in
 * case of error. **min** and **max** may be provided as additional restriction
 * for `value`.
 *
 * @param {number|string} value
 * @param {string} [type = 'number']
 * @param {number|string} [min]
 * @param {number|string} [max]
 */
check.number = function (conf, value, type = "number", min, max = "unlimited") {
  const num = +value
  if (isNaN(num)) {
    status.error(
      conf,
      `Invalid ${type} (should be a number): ${value}`,
      "throw"
    )
  } else if (min && num < min || max && num > max) {
    status.error(
      conf,
      `Invalid ${type} (should be between ${min} and ${max} ): ${value}`,
      "throw"
    )
  }
}

/**
 * Generic check for integers. Check that **value** is an integer or a string
 * representing an integer. **type** is for the customization of the message in
 * case of error. **min** and **max** may be provided as additional restriction for
 * **value**.
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

/**
 * Check that **value** is an UTF-8 string.
 *
 * *Note:* This use a weak (simplified) test that may not be accurate for small
 * strings.
 *
 * @param  {String} value
 */
check.utf8 = function (conf, value) {
  if (typeof value !== "string" || !misc.isUtf8(value)) {
    status.error(conf, `Invalid UTF8 string: ${value}`, "throw")
  }
}

/**
 * Check that **value** is a base64 string.
 *
 * @param  {String} value
 */
check.base64 = function (conf, value) {
  if (typeof value !== "string" || !misc.isBase64(value)) {
    status.error(conf, `Invalid base64 string: ${value}`, "throw")
  }
}

/******************************************************************************/

check.amount = function (conf, amount) {
  check.number(conf, amount, "amount")
}

check.address = function (conf, address) {
  if (address.length !== 56 && !address.match(/.*\*.*\..*/)) {
    status.error(conf, "Invalid address: " + misc.shorter(address), "throw")
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

check.authorizeFlag = function (conf, flag) {
  check.integer(conf, flag, "authorize flag", 0, 3)
}

check.boolean = function (conf, boolean) {
  if (typeof boolean !== "boolean") {
    status.error(conf, "Invalid boolean: " + boolean, "throw")
  }
}

check.buffer = function (conf, buffer) {
  switch (buffer.type) {
  case "text":
    check.utf8(conf, buffer.value)
    break
  case "base64":
    check.base64(conf, buffer.value)
    break
  default:
    status.error(conf, "Invalid buffer type: " + buffer.type, "throw")
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
  if (hash.length !== 64 || !hash.match(/^[0-9a-f]*$/)) {
    status.error(conf, "Invalid hash: " + hash, "throw")
  }
}

check.id = function (conf, id) {
  if (!id.match(/^[0-9]*$/)) status.error(conf, "Invalid id: " + id, "throw")
}

check.memo = function (conf, memo) {
  switch (memo.type) {
  case "text":
    check.utf8(conf, memo.value)
    break
  case "base64":
    check.base64(conf, memo.value)
    break
  case "hash":
  case "return":
    check.hash(conf, memo.value)
    break
  case "id":
    check.id(conf, memo.value)
    break
  default:
    status.error(conf, "Invalid memo type: " + memo.type, "throw")
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
specs.types.forEach((type) => {
  if (!exports[type]) exports[type] = (conf, value) => value
})
