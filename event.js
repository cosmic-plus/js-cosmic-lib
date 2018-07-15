'use strict'
/**
 * Contains the methods to trigger and handle events.
 *
 * @private
 */
const event = exports

const helpers = require('./helpers')

event.setClickHandler = function (cosmicLink, fieldType, callback) {
  cosmicLink.clickHandlers[fieldType] = callback
}

event.clearClickHandler = function (cosmicLink, fieldType) {
  cosmicLink.clickHandlers[fieldType] = undefined
}

/** Call the current click handler for `fieldType` with `eventObject` as
 * argument.
 *
 * @private
 * @param {string} fieldType One of: `address`, `asset`, `hash`
 * @param {Object} eventObject
 */
event.callClickHandler = function (cosmicLink, fieldType, eventObject) {
  const handler = cosmicLink.clickHandlers[fieldType]
  if (handler) handler(eventObject)
}


/***** Format events *****/

const allFormats = ['uri', 'query', 'tdesc', 'json', 'transaction', 'xdr']

event.addFormatHandler = function (cosmicLink, format, callback) {
  const handlers = cosmicLink.formatHandlers
  if (!handlers[format]) handlers[format] = []
  handlers[format].push(callback)

  handleFormat(cosmicLink, format, [callback])
}

event.removeFormatHandler = function (cosmicLink, format, callback) {
  const handlers = cosmicLink.formatHandlers
  if (!handlers[format]) return

  handlers[format] = handlers[format].filter(entry => entry !== callback)
}

/**
 * Calls format handlers for `...formats` or for every formats if `...formats`
 * is not specified.
 *
 * @private
 * @param {...string} ...formats
 */
event.callFormatHandlers = function (cosmicLink, ...formats) {
  if (!formats.length) formats = allFormats
  const handlers = cosmicLink.formatHandlers

  formats.forEach(entry => {
    if (handlers[entry]) handleFormat(cosmicLink, entry, handlers[entry])
  })
}

function handleFormat (cosmicLink, format, handlers) {
  const getter = cosmicLink['get' + helpers.capitalize(format)]
  if (!getter) return

  getter().then(value => {
    const event = { cosmicLink: cosmicLink, value: value }
    handlers.forEach(callback => callback(event))
  }).catch(error => {
    const event = { cosmicLink: cosmicLink, error: error }
    handlers.forEach(callback => callback(event))
  })
}
