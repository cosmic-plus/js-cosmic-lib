/**
 * Utilities to manipulate HTML element from javascript.
 *
 * Those may not be feature complete, as this library purpose is to ease
 * cosmic-lib and Stellar Authenticator development, rather than provide a
 * generic-case toolbox.
 *
 * @module
 */

/**
 * Append `childs` as the end of `element`.
 *
 * @param {HTMLElement} element
 * @param {...(HTMLElement|String|Error)} childs
 */
export function append (element, ...childs) {
  childs.forEach(child => {
    if (typeof child === 'string' || child instanceof Error) {
      element.appendChild(document.createTextNode(child))
    } else {
      element.appendChild(child)
    }
  })
}

/**
 * Add `newClass` as an additionnal class for `element`.
 *
 * @param {HTMLElement} element
 * @param {string} newClass
 * */
export function appendClass (element, newClass) {
  element.className = element.className + ' ' + newClass
}

/**
 * Remove everything inside `element`.
 *
 * @param {HTMLElement} element
 * */
export function clear (element) {
  element.innerHTML = ''
}

/**
 * Copy text inside `element`. `element` should be a textbox like textarea or
 * text input.
 *
 * @param {HTMLElement} element
 * @param
 * */
export function copyContent (element) {
  element.select()
  document.execCommand('copy')
}

/**
 * Return a newly created HTML element whose tag is `name`, attributes
 * `attributes` and childs `childs`.
 *
 * @param {string} name
 * @param {object|string} [attributes|className|ID]
 * @param {...HTMLElement} [childs]
 */
export function create (name, attributes, ...childs) {
  if (!name) throw new Error('Missing tag name')

  const element = document.createElement(name)

  if (typeof attributes === 'string') {
    switch (attributes.substr(0, 1)) {
      case '#': element.id = attributes.substr(1); break
      case '.': element.className = attributes.substr(1); break
      default: throw new Error('Unhandled attribute')
    }
  } else {
    let field; for (field in attributes) {
      element[field] = attributes[field]
    }
  }

  if (childs.length > 0) append(element, ...childs)

  return element
}

/**
 * Destroy `element`.
 *
 * @param {HTMLElement} element
 * */
export function destroy (element) {
  try {
    element.innerHTML = ''
    if (element.parentNode) element.parentNode.removeChild(element)
  } catch (e) { console.log(e) }
}

/**
 * Return the first element matching `pattern`.
 * If `name` starts with `#`, it will match against IDs.
 * If `name` starts with `.`, it will match against classes.
 * If `name` is a plain word, it will match against tags.
 * If `parent` is given, it will look recursively in `parent` childs.
 *
 * @param {string} pattern
 * @param {HTMLElement} [parent=document]
 * */
export function grab (pattern, parent = document) {
  switch (pattern.substr(0, 1)) {
    case '#':
      return parent.getElementById(pattern.substr(1))
    case '.':
      return parent.getElementsByClassName(pattern.substr(1))[0]
    default:
      return parent.getElementsByTagName(pattern)[0]
  }
}

/**
 * Set the `style.display` property of `...elements` to `block`.
 *
 * @param {...HTMLElement} elements
 */
export function show (...elements) {
  elements.forEach(element => element.style.display = 'block')
}

/** Set the `style.display` property of `...elements` to `none`.
 *
 * @param {...HTMLElement} elements
 */
export function hide (...elements) {
  elements.forEach(element => element.style.display = 'none')
}

/**
 * Set the content of element to ...childs. Any previous content will be erased.
 *
 * @param {HTMLElement} element
 * @param {...HTMLElement} childs
 */
export function rewrite (element, ...childs) {
  clear(element)
  append(element, ...childs)
}
