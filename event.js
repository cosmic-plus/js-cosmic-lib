'use strict'
/**
 * Contains the methods to trigger and handle events.
 *
 * @exports event
 */
const event = exports

const helpers = require('./helpers')
const node = require('./node')

/**
 * Call handler (in any) defined for `type` in `cosmicLink`. Call it with
 * arguments `cosmicLink`, `value`, `element`; Where `element` is the clicked
 * HTML element and `value` the field value it represents.
 *
 * @param {CL}
 * @param {string} Type The type of `object` as defined in specs.js
 * @param {*}  value Field value in `transaction descriptor` format
 * @param {HTMLElement} element HTML element displaying `value`
 * @return *
 */
event.handle = function (cosmicLink, type, value, element) {
  if (!cosmicLink || !cosmicLink.onClick) return
  const handler = cosmicLink.onClick[type]
  if (handler) return handler(cosmicLink, value, element)
}

event.trigger = function (cosmicLink, type, value, element) {
  return () => event.handle(cosmicLink, type, value, element)
}

/**
 * Default handlers for address and asset onclick events.
 *
 * @namespace
 */
event.defaultHandler = {}

event.defaultHandler.address = function address (cosmicLink, account) {
  let message = ''
  for (let field in account) {
    message += field + ':\n' + account[field] + '\n\n'
  }
  window.alert(message)
}

event.defaultHandler.asset = function (cosmicLink, asset, element) {
  const issuerNode = node.grab('.CL_assetIssuer', element)
  if (issuerNode.style.display === 'inline') issuerNode.style.display = 'none'
  else issuerNode.style.display = 'inline'
}

// TODO: implement a complete event handling interface.
// Possible structure for an event object.
// ~ {
// ~ type: 'onClick'
// ~ node: HTMLElement,
// ~ operation: 0|undefined,
// ~ field: 'address',
// ~ value: 'GAWO...',
// ~ }
//
// event.trigger(cosmicLink, eventType, [operation], [field], [value], [node], [add])
// event.listen(cosmicLink, eventType, handler))

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
