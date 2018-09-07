'use strict'
/**
 * Contains the methods to trigger and handle events.
 *
 * @private
 * @exports event
 */
const event = exports

const helpers = require('ticot-box/misc')


/***** Click events *****/

event.setClickHandler = function (conf, fieldType, callback) {
  conf.clickHandlers[fieldType] = callback
}

event.clearClickHandler = function (conf, fieldType) {
  conf.clickHandlers[fieldType] = undefined
}

event.callClickHandler = function (conf, fieldType, eventObject) {
  const handler = conf.clickHandlers[fieldType]
  if (handler) handler(eventObject)
}


/***** Format events *****/

const allFormats = ['uri', 'query', 'tdesc', 'json', 'transaction', 'xdr']

event.addFormatHandler = function (conf, format, callback) {
  const handlers = conf.formatHandlers
  if (!handlers[format]) handlers[format] = []
  handlers[format].push(callback)

  handleFormat(conf, format, [callback])
}

event.removeFormatHandler = function (conf, format, callback) {
  const handlers = conf.formatHandlers
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
