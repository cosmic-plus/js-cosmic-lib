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
 * Set click handler for `fieldType` HTML elements as `callback`.
 *
 * @param {CL}
 * @param {string} fieldType One of: `address`, `asset`, `hash`
 * @param {function} callback
 */
event.setClickHandler = function (cosmicLink, fieldType, callback) {
  cosmicLink.clickHandlers[fieldType] = callback
}

/** Clear the current onclick handler for `fieldType`.
 *
 * @param {CL}
 * @param {string} fieldType One of: `address`, `asset`, `hash`
 */
event.clearClickHandler = function (cosmicLink, fieldType) {
  cosmicLink.clickHandlers[fieldType] = undefined
}

/** Call the current clickhandler for `fieldType` with `eventObject` as
 * argument.
 *
 * @param {CL}
 * @param {string} fieldType One of: `address`, `asset`, `hash`
 * @param {Object} eventObject
 */
event.callClickHandler = function (cosmicLink, fieldType, eventObject) {
  const handler = cosmicLink.clickHandlers[fieldType]
  if (handler) handler(eventObject)
}

event.defaultClickHandlers = {
  address: function (event) {
    if (!event.account) return
    let message = ''
    for (let field in event.account) {
      message += `${field}:\n` + `${event.account[field]}\n\n`
    }
    window.alert(message)
  },
  asset: function (event) {
    const issuerNode = node.grab('.CL_assetIssuer', event.node)
    if (issuerNode.style.display === 'inline') issuerNode.style.display = 'none'
    else issuerNode.style.display = 'inline'
  },
  hash: function (event) {
    const grandma = event.node.parentNode.parentNode.parentNode
    if (grandma.className === 'CL_signers') {
      const preimage = prompt('Please enter preimage:')
      if (preimage) event.cosmicLink.sign(preimage)
    } else {
      helpers.copy(event.value)
    }
  }
}

/// Format events

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
