'use_strict'
/**
 * Library-wide configuration.
 * @exports default
 */
const defaults = exports

const helpers = require('./helpers')
const node = require('./node')
const aliases = require('./aliases')
const event = require('./event')

/**
 * The base URI to build cosmic links
 * @default 'https://cosmic.link/'
 */
defaults.page = 'https://cosmic.link/'
/**
 * The default network to use
 * @default 'public'
 */
defaults.network = 'public'
/**
 * The default source account to use
 * @default null
 */
defaults.user = null

defaults.aliases = aliases.all
defaults.addAliases = function (aliases) { aliases.add(defaults, aliases) }
defaults.removeAliases = function (array) { aliases.remove(defaults, array) }

defaults.setClickHandler = function (fieldType, callback) {
  event.setClickHandler(defaults, fieldType, callback)
}
defaults.clearClickHandler = function (fieldType, callback) {
  event.clearClickHandler(defaults, fieldType, callback)
}

defaults.formatHandlers = {}
defaults.addFormatHandler = function (format, callback) {
  event.addFormatHandler(defaults, format, callback)
}
defaults.removeFormatHandler = function (format, callback) {
  event.removeFormatHandler(defaults, format, callback)
}

defaults.clickHandlers = {
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
