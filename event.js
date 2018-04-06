'use strict'

import * as node from './node'

/**
 * Contains the methods to trigger and handle events.
 *
 * @module
 */

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
export function handle (cosmicLink, type, value, element) {
  if (!cosmicLink || !cosmicLink.onClick) return
  const handler = cosmicLink.onClick[type]
  if (handler) return handler(cosmicLink, value, element)
}

export function trigger (cosmicLink, type, value, element) {
  return () => handle(cosmicLink, type, value, element)
}

/**
 * Default handlers for address and asset onclick events.
 *
 * @namespace
 */
export const defaultHandler = {}

defaultHandler.address = function address (cosmicLink, account) {
  let message = ''
  for (let field in account) {
    message += field + ':\n' + account[field] + '\n\n'
  }
  window.alert(message)
}

defaultHandler.asset = function (cosmicLink, asset, element) {
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
