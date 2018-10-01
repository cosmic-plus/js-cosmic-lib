'use strict'
/**
 * Contains the methods to trigger and handle events.
 *
 * @private
 * @exports event
 */
const event = exports

const helpers = require('@cosmic-plus/jsutils/misc')

/** *** Click events *****/

/**
 * Set the click handler for `type` HTML elements as `callback`.
 *
 * @example
 * cosmicLib.config.setClickHandler('address', showAddressPopup)
 *
 * @param {string} type Type of a transaction/operation field such as
 *     `address`, `asset`, `hash`, ...
 * @param {function} callback A function that accept one `event` argument
 */
event.setClickHandler = function (conf, type, callback) {
  conf.clickHandlers[type] = callback
}

/**
 * Remove the current click handler for `type`.
 *
 * @example
 * cosmicLib.config.clearClickHandler('address')
 *
 * @param {string} type Type of a transaction/operation field such as
 *     `address`, `asset`, `hash`, ...
 */
event.clearClickHandler = function (conf, type) {
  conf.clickHandlers[type] = undefined
}

event.callClickHandler = function (conf, type, event) {
  const handler = conf.clickHandlers[type]
  event.extra = event.domNode.extra
  event.field = event.domNode.field
  if (handler) handler(event)
}

/**
 * The active click handlers. Takes the form:
 *
 * ```
 * cosmicLib.config.clickHandlers = {
 *   type1: callback1,
 *   ...
 *   typeN: callbackN
 * }
 * ```
 *
 * Thoses click handlers are set by default:
 *
 * ```
 *  address: 'A prompt that show the address',
 *  hash: 'A function that copy the hash into the clipboard or show a prompt
 *     box to enter preimage signature when relevant'
 * ```
 */
event.defaultClickHandlers = {
  address: function (event) {
    if (!event.extra) return
    let message = ''
    for (let field in event.extra) {
      message += `${field}:\n` + `${event.extra[field]}\n\n`
    }
    window.alert(message)
  },
  hash: function (event) {
    const grandma = event.domNode.parentNode.parentNode.parentNode
    if (grandma.classList.contains('cosmiclib_signers')) {
      const preimage = prompt('Please enter preimage:')
      if (preimage) event.cosmicLink.sign(preimage)
    } else {
      helpers.copy(event.value)
    }
  },
  id: helpers.copy
}
