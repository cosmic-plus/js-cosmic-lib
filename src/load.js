"use_strict"
/**
 * Asynchronously load external ressources.
 */

/**/
const load = require("@cosmic-plus/domutils/es5/load")
module.exports = load

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
load.styles = async function (
  href = "https://cdn.cosmic.plus/cosmic-lib@2.x/cosmic-lib.css"
) {
  const promise = load.css(href)
  load.styles = () => promise
  return promise
}
