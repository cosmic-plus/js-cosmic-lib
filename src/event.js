'use strict'
/**
 * Contains the methods to trigger and handle events.
 *
 * @private
 * @exports event
 */
const event = exports

/** *** Click events *****/

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

/** *** Format events *****/

const allFormats = ['any', 'uri', 'query', 'tdesc', 'json', 'transaction', 'xdr']

event.addFormatHandler = function (conf, format, callback) {
  const handlers = conf.formatHandlers
  if (!handlers[format]) handlers[format] = []
  handlers[format].push(callback)
}

event.removeFormatHandler = function (conf, format, callback) {
  const handlers = conf.formatHandlers
  if (!handlers[format]) return

  handlers[format] = handlers[format].filter(entry => entry !== callback)
}

event.callFormatHandlers = function (cosmicLink, formats = allFormats) {
  const handlers = cosmicLink.formatHandlers
  formats.forEach(entry => {
    if (handlers[entry]) handleFormat(cosmicLink, entry, handlers[entry])
  })
}

function handleFormat (cosmicLink, format, handlers) {
  if (format !== 'any' && !cosmicLink[format] && !cosmicLink.status) return
  handlers.forEach(callback => callback(cosmicLink))
}
