'use strict'
/**
 * Contains the methods to update cosmic link status and HTML status node.
 * Thoses methods won't have effect unless status reporting is enabled on `conf`
 * object by using `status.init` (wich is done automatically on CosmicLink
 * objects).
 *
 * @private
 * @exports status
 */
const status = exports

const html = require('@cosmic-plus/jsutils/html')

/**
 * Initialize `conf.status` & `conf.errors`.
 */
status.init = function (conf) {
  conf.status = null
  conf.errors = false
}

/**
 * Set `conf` status as `status` and update statusNode. Error status should be
 * recorded using the `status.fail` function bellow. Once a status is set it
 * won't be mutated.
 *
 * @param {string} status
 */
status.update = function (conf, status) {
  if (conf.status || conf.status === undefined) return

  console.log('Set status: ' + status)
  conf.status = status

  if (conf._statusNode) {
    const title = html.grab('.cosmiclib_status', conf._statusNode)
    title.textContent = status
  }
}

/**
 * Set `conf` status as error status `status` and update statusNode. This
 * implies that the cosmic link or the underlying transaction is invalid. Then,
 * call `continuation` if any. `continuation` should be a either a function or
 * 'throw'.
 *
 * @param {string} status
 * @param {function|'throw'} [continuation]
 */
status.fail = function (conf, errorStatus, continuation) {
  status.update(conf, errorStatus)
  if (conf._statusNode) html.appendClass(conf._statusNode, 'cosmiclib_error')
  errorContinuation(errorStatus, continuation)
}

/**
 * Append `error` to `conf.errors` and to the HTML display. Then, call
 * `continuation` if any. `continuation` should be a either a function or
 * 'throw'.
 *
 * @param {string} error
 * @param {procedure|'throw'} [continuation]
 */
status.error = function (conf, error, continuation) {
  console.log(error)

  if (conf.errors !== undefined) {
    if (!conf.errors) conf.errors = []

    conf.errors.push(error)

    if (conf._statusNode) {
      const errorsNode = html.grab('.cosmiclib_errors', conf._statusNode)
      const lineNode = html.create('li', null, error)
      html.append(errorsNode, lineNode)
    }
  }

  errorContinuation(error, continuation)
}

/**
 * Create & return an HTML element that displays `conf` status and eventual
 * errors.
 *
 * @return {htmlElement}
 */
status.makeHtmlNode = function (conf) {
  const statusNode = html.create('div', '.cosmiclib_statusNode')

  const statusLine = html.create('span', '.cosmiclib_status')
  html.append(statusNode, statusLine)
  if (conf.status) statusLine.textContent = conf.status

  const errorsNode = html.create('ul', '.cosmiclib_errors')
  html.append(statusNode, errorsNode)
  if (conf.errors) {
    conf.errors.forEach(error => {
      const errorLine = html.create('li', null, error)
      html.append(errorsNode, errorLine)
    })
  }

  return statusNode
}

/**
 * If `continuation` is a function, call it with `error` as argument.
 * If `continuation` equal 'throw', throw a new error with `error` as message.
 * If `continuation` is undefined, do nothing.
 */
function errorContinuation (error, continuation) {
  if (continuation) {
    if (continuation === 'throw') throw new Error(error)
    else continuation(error)
  }
}
