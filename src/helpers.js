'use strict'
/**
 * Various independent helpers.
 *
 * @exports helpers
 */
const helpers = exports

const node = require('./node')

/**
 * Return a function that will execute `thunk` when called, and return the
 * result of its execution as a Promise. Handle async and regular functions
 * equally. Any error will be carried to .catch.
 *
 * @param {function} thunk A parameterless function
 * @return {function}
 */
helpers.delay = function (thunk) {
  let firstCall = true
  let memoized
  return function () {
    if (firstCall) {
      firstCall = false
      memoized = new Promise((resolve) => resolve(thunk()))
    }
    return memoized
  }
}

/**
 * Return a promise that takes `x` seconds to resolve
 *
 * @param {number} x Time to wait
 * @return {Promise}
 */
helpers.timeout = function (x) {
  return new Promise(function (resolve) { setTimeout(resolve, x) })
}

/**
 * Return `string` with first letter capitalized.
 *
 * @param {string} string
 * @return {string}
 */
helpers.capitalize = function (string) {
  return string.substr(0, 1).toUpperCase() + string.slice(1)
}

/**
 * Return shortified `string` if longer than 30 characters; else return
 * `string`.
 *
 * @param {string}
 * @return {string}
 */
helpers.shorter = function (string) {
  if (string.length > 50) {
    return string.substr(0, 5) + '...' + string.substr(-5)
  } else {
    return string
  }
}

/**
 * Return a function that copy `string` into user clipboard.
 *
 * @private
 * @param {string} string
 * @return {function}
 */
helpers.copy = function (string) {
  const textBox = node.create('textarea', {}, string)
  node.append(node.grab('body'), textBox)
  node.copyContent(textBox)
  node.destroy(textBox)
}
