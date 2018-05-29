'use strict'

/**
 * Contains the methods to update cosmic link status and HTML status node.
 * This is mostly about error handling.
 *
 * @exports status
 */
const status = exports

const node = require('./node')

/**
 * Set `cosmicLink` status as `status` and update statusNode.
 * All status are considered erroneous.
 * Error status should be recorded using the fail function bellow.
 * A valid cosmic link may have no status at all.
 * `status` changes are logged.
 *
 * @param {cosmicLink} cosmicLink
 * @param {string} status
 */
status.update = function (cosmicLink, status) {
  if (cosmicLink.status) return
  console.log('Set status: ' + status)
  if (cosmicLink) cosmicLink.status = status

  if (cosmicLink._statusNode) {
    const title = node.grab('.CL_status', cosmicLink._statusNode)
    title.textContent = status
  }
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
status.fail = function (cosmicLink, errorStatus, continuation) {
  status.update(cosmicLink, errorStatus)
  if (cosmicLink._statusNode) node.appendClass(cosmicLink.statusNode, 'CL_error')
  errorContinuation(errorStatus, continuation)
}

/**
 * Append `error` to `cosmicLink`.errors and to the HTML display.
 * Then, call `continuation` if any. `continuation` should be a either a
 * function or 'throw'.
 * `error`s are logged.
 *
 * @param {cosmicLink} cosmicLink
 * @param {string} error
 * @param {procedure|'throw'} [continuation]
 */
status.error = function (cosmicLink, error, continuation) {
  console.log(error)

  if (cosmicLink) {
    if (!cosmicLink.errors) cosmicLink.errors = []
    cosmicLink.errors.push(error)
  }
  if (cosmicLink._statusNode) {
    const errorsNode = node.grab('.CL_events', cosmicLink._statusNode)
    const lineNode = node.create('li', '.CL_error', error)
    node.append(errorsNode, lineNode)
  }

  errorContinuation(error, continuation)
}

/**
 * Populate `cosmicLink.statusNode` with status anderrors from
 * `cosmicLink.errors`.
 *
 * @param {CL}
 */
status.populateHtmlNode = function (cosmicLink) {
  if (cosmicLink.status) {
    const titleNode = node.grab('.CL_status', cosmicLink.statusNode)
    titleNode.textContent = cosmicLink.status
  }
  if (cosmicLink.errors) {
    const errorsNode = node.grab('.CL_events', cosmicLink.statusNode)
    for (let index in cosmicLink.errors) {
      const error = cosmicLink.errors[index]
      node.append(errorsNode, node.create('li', '.CL_error', error))
    }
  }
}

/**
 * If `continuation` is a function, call it with `error` as argument.
 * If `continuation` equal 'throw', throw a new error with *error as message.
 * If `continuation` is undefined, do nothing.
 *
 * @private
 * @param {string} error
 * @param {function|'throw'} [continuation]
 */
function errorContinuation (error, continuation) {
  if (continuation) {
    if (continuation === 'throw') throw new Error(error)
    else continuation(error)
  }
}
