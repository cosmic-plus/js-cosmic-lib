'use strict'

/**
 * Various independent helpers.
 *
 * @module
 */

/**
 * Return a function that will execute `thunk` when called, and return the
 * result of its execution as a Promise. Handle async and regular functions
 * equally. Any error will be carried to .catch.
 *
 * @param {function} thunk A parameterless function
 * @return {function}
 */
export function delay (thunk) {
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
export function timeout (x) {
  return new Promise(function (resolve) { setTimeout(resolve, x) })
}

/**
 * Return `string` with first letter capitalized.
 *
 * @param {string} string
 * @return {string}
 */
export function capitalize (string) {
  return string.substr(0, 1).toUpperCase() + string.slice(1)
}

/**
 * Return shortified `string` if longer than 30 characters; else return
 * `string`.
 *
 * @param {string}
 * @return {string}
 */
export function shorter (string) {
  if (string.length > 30) {
    return string.substr(0, 5) + '...' + string.substr(-5)
  } else {
    return string
  }
}
