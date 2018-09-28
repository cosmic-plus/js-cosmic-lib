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

event.setClickHandler = function (conf, fieldType, callback) {
  conf.clickHandlers[fieldType] = callback
}

event.clearClickHandler = function (conf, fieldType) {
  conf.clickHandlers[fieldType] = undefined
}

event.callClickHandler = function (conf, type, event) {
  const handler = conf.clickHandlers[type]
  event.extra = event.domNode.extra
  event.field = event.domNode.field
  if (handler) handler(event)
}

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
    if (grandma.classList.contains('CL_signers')) {
      const preimage = prompt('Please enter preimage:')
      if (preimage) event.cosmicLink.sign(preimage)
    } else {
      helpers.copy(event.value)
    }
  }
}

/** *** Format events *****/

const allFormats = ['any', 'uri', 'query', 'tdesc', 'json', 'transaction', 'xdr', 'sep7']

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
