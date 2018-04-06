'use strict'

import * as node from './node'

/**
 * Contains the methods to update cosmic link status and HTML status node.
 * This is mostly about error handling.
 *
 * @module
 */

/**
 * Set `cosmicLink` status as `status` and update statusNode.
 * All status are considered erroneous except 'signed' & 'sended'.
 * Error status should be recorder using the fail function bellow.
 * A valid cosmic link may have no status at all.
 * `status` changes are logged.
 *
 * @param {cosmicLink} cosmicLink
 * @param {string} status
 */
export function update (cosmicLink, status) {
  console.log('Set status: ' + status)
  if (cosmicLink) {
    cosmicLink.status = status
    _stateNode(cosmicLink).textContent = '↪ ' + status
  }
}

/**
 * Log event into the console.
 * Append `event` to the HTML event list of `cosmicLink` (in statusNode).
 *
 * @param {cosmicLink} cosmicLink
 * @param {string} event
 * @return {HTLMElement} The <li>event</li> inserted into events list
 */
export function message (cosmicLink, event) {
  const lineNode = node.create('li', {}, event)
  if (cosmicLink) node.append(_eventsNode(cosmicLink), lineNode)
  return lineNode
}

/**
 * Set `cosmicLink` status as error status `status` and update statusNode.
 * This implies that the cosmic link or the underlying transaction is invalid.
 * Then, call `continuation` if any. `continuation` should be a either a
 * function or 'throw'.
 *
 * @param {cosmicLink} cosmicLink
 * @param {string} status
 * @param {function|'throw'} [continuation]
 */
export function fail (cosmicLink, status, continuation) {
  update(cosmicLink, status)
  if (cosmicLink) node.appendClass(cosmicLink.statusNode, 'CL_error')
  _errorContinuation(status, continuation)
}

/**
 * Append `error` to `cosmicLink`.errors and to its the HTML event list.
 * Then, call `continuation` if any. `continuation` should be a either a
 * function or 'throw'.
 * `error`s are logged.
 *
 * @param {cosmicLink} cosmicLink
 * @param {string} error
 * @param {procedure|'throw'} [continuation]
 */
export function error (cosmicLink, error, continuation) {
  console.log(error)
  const errorNode = message(cosmicLink, error)

  if (cosmicLink) {
    if (!cosmicLink.errors) cosmicLink.errors = []
    cosmicLink.errors.push(error)
    errorNode.className = 'CL_error'
  }

  _errorContinuation(error, continuation)
}

/**
 * Return the head of `cosmicLink` statusNode.
 *
 * @private
 * @param {cosmicLink} cosmicLink
 */
function _stateNode (cosmicLink) {
  return node.grab('.CL_status', cosmicLink.statusNode)
}

/**
 * Return the list of `cosmicLink` statusNode.
 *
 * @private
 * @param {cosmicLink} cosmicLink
 */
function _eventsNode (cosmicLink) {
  return node.grab('.CL_events', cosmicLink.statusNode)
}

/**
 * If `continuation` is a function, call it with `error` as argument.
 * If `continuation` equal 'throw', throw a new error with *error as message.
 * If *continuation is undefined, do nothing.
 *
 * @private
 * @param {string} error
 * @param {function|'throw'} [continuation]
 */
function _errorContinuation (error, continuation) {
  if (continuation) {
    if (continuation === 'throw') throw new Error(error)
    else continuation(error)
  }
}
