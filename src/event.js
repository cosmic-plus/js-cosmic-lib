'use strict'
/**
 * Contains the methods to trigger and handle events.
 *
 * @private
 */
const event = exports

const helpers = require('ticot-box/misc')


/***** Click events *****/

event.setClickHandler = function (cosmicLink, fieldType, callback) {
  cosmicLink.clickHandlers[fieldType] = callback
}

event.clearClickHandler = function (cosmicLink, fieldType) {
  cosmicLink.clickHandlers[fieldType] = undefined
}

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
