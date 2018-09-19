'use strict'

/**
 * Contains the methods to update cosmic link status and HTML status node.
 * This is mostly about error handling.
 *
 * @private
 * @exports status
 */
const status = exports

const html = require('@cosmic-plus/jsutils/html')

/**
 * Set `conf` status as `status` and update statusNode.
 * All status are considered erroneous.
 * Error status should be recorded using the fail function bellow.
 * A valid cosmic link may have no status at all.
 * `status` changes are logged.
 *
 * @param {string} status
 */
status.update = function (conf, status) {
  if (conf.status) return
  console.log('Set status: ' + status)
  conf.status = status

  if (conf._statusNode) {
    const title = html.grab('.CL_status', conf._statusNode)
    title.textContent = status
  }
}

/**
 * Set `conf` status as error status `status` and update statusNode.
 * This implies that the cosmic link or the underlying transaction is invalid.
 * Then, call `continuation` if any. `continuation` should be a either a
 * function or 'throw'.
 *
 * @param {string} status
 * @param {function|'throw'} [continuation]
 */
status.fail = function (conf, errorStatus, continuation) {
  status.update(conf, errorStatus)
  if (conf._statusNode) html.appendClass(conf.statusNode, 'CL_error')
  errorContinuation(errorStatus, continuation)
}

/**
 * Append `error` to `conf`.errors and to the HTML display.
 * Then, call `continuation` if any. `continuation` should be a either a
 * function or 'throw'.
 * `error`s are logged.
 *
 * @param {string} error
 * @param {procedure|'throw'} [continuation]
 */
status.error = function (conf, error, continuation) {
  console.log(error)

  if (!conf.errors) conf.errors = []
  conf.errors.push(error)
  if (conf._statusNode) {
    const errorsNode = html.grab('.CL_events', conf._statusNode)
    const lineNode = html.create('li', '.CL_error', error)
    html.append(errorsNode, lineNode)
  }

  errorContinuation(error, continuation)
}

/**
 * Populate `conf.statusNode` with status anderrors from
 * `conf.errors`.
 */
status.populateHtmlNode = function (conf) {
  if (conf.status) {
    const titleNode = html.grab('.CL_status', conf.statusNode)
    titleNode.textContent = conf.status
  }
  if (conf.errors) {
    const errorsNode = html.grab('.CL_events', conf.statusNode)
    for (let index in conf.errors) {
      const error = conf.errors[index]
      html.append(errorsNode, html.create('li', '.CL_error', error))
    }
  }
}

/**
 * If `continuation` is a function, call it with `error` as argument.
 * If `continuation` equal 'throw', throw a new error with *error as message.
 * If `continuation` is undefined, do nothing.
 */
function errorContinuation (error, continuation) {
  if (continuation) {
    if (continuation === 'throw') throw new Error(error)
    else continuation(error)
  }
}
