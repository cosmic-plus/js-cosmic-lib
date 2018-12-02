"use_strict"
/**
 * Asynchronously load external ressources.
 */
const parent = require("@cosmic-plus/jsutils/load")
const load = module.exports

/**
 *
 * Load cosmic-lib CSS from **href** or from default origin. All subsequent
 * calls will refer to the original request.
 *
 * @example
 * /// Preload at the start of your script:
 * cosmicLib.load.styles('css/cosmic-lib.css')
 *
 * /// Then wait for the request to resolve before you display CosmicLink HTML
 * /// description:
 * await cosmicLib.load.styles()
 *
 * @alias module:load#styles
 * @async
 * @param {string} [href='cosmic-lib.css']
 */
load.styles = async function (conf, href = "https://cosmic.plus/cosmic-lib/cosmic-lib.css") {
  const promise = parent.css(href)
  load.styles = () => promise
  return promise
}

// Make other member compatible with how cosmic-lib exposes modules.
load.css = (conf, href) => parent.css(href)
