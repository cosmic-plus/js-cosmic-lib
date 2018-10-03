'use_strict'
/**
 * Asynchronously load external ressources.
 *
 * @exports load
 */
const load = exports

const dom = require('@cosmic-plus/jsutils/dom')
const html = require('@cosmic-plus/jsutils/html')

/**
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
 * @async
 * @param {string} [href='cosmic-lib.css']
 */
load.styles = async function (conf, href = 'https://cosmic.plus/cosmic-lib/cosmic-lib.css') {
  const promise = load.css(conf, href)
  load.styles = () => promise
  return promise
}

/**
 * Load a CSS from **href**.
 *
 * @example
 * /// Preload at script initialization:
 * const cssLoader = cosmicLib.load.css('my-styles.css')
 *
 * /// To wait for loading to finish:
 * await cssLoader
 *
 * @async
 * @param {string} href
 */
load.css = async function (conf, href) {
  return new Promise(function (resolve, reject) {
    const attributes = { rel: 'stylesheet', type: 'text/css', href: href, onload: resolve, onerror: reject }
    const linkNode = html.create('link', attributes)
    html.append(dom.head, linkNode)
  })
}
