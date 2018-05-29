'use_strict'
/**
 * Utilities to manipulate HTML element from javascript.
 *
 * Those may not be feature complete, as this library purpose is to ease
 * cosmic-lib and Stellar Authenticator development, rather than provide a
 * generic-case toolbox.
 *
 * @exports node
 */
const node = exports

/**
 * Append `childs` as the end of `element`.
 *
 * @param {HTMLElement} element
 * @param {...(HTMLElement|String|Error)} childs
 */
node.append = function (element, ...childs) {
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
node.appendClass = function (element, newClass) {
  element.className += ' ' + newClass
}

/**
 * Remove everything inside `element`.
 *
 * @param {HTMLElement} element
 * */
node.clear = function (element) {
  element.innerHTML = ''
}

/**
 * Copy text inside `element`. `element` should be a textbox like textarea or
 * text input.
 *
 * @param {HTMLElement} element
 * @param
 * */
node.copyContent = function (element) {
  element.select()
  return document.execCommand('copy')
}

/**
 * Return a newly created HTML element whose tag is `name`, attributes
 * `attributes` and childs `childs`.
 *
 * @param {string} name
 * @param {object|string} [attributes|className|ID]
 * @param {...HTMLElement} [childs]
 */
node.create = function (name, attributes, ...childs) {
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

  if (childs.length > 0) node.append(element, ...childs)

  return element
}

/**
 * Destroy `element`.
 *
 * @param {HTMLElement} element
 * */
node.destroy = function (element) {
  try {
    element.innerHTML = ''
    if (element.parentNode) element.parentNode.removeChild(element)
  } catch (error) { console.log(error) }
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
node.grab = function (pattern, parent = document) {
  return parent.querySelector(pattern)
}

/**
 * Set the `style.display` property of `...elements` to `block`.
 *
 * @param {...HTMLElement} elements
 */
node.show = function (...elements) {
  elements.forEach(element => element.style.display = 'block')
}

/** Set the `style.display` property of `...elements` to `none`.
 *
 * @param {...HTMLElement} elements
 */
node.hide = function (...elements) {
  elements.forEach(element => element.style.display = 'none')
}

/**
 * Set the content of element to ...childs. Any previous content will be erased.
 *
 * @param {HTMLElement} element
 * @param {...HTMLElement} childs
 */
node.rewrite = function (element, ...childs) {
  node.clear(element)
  node.append(element, ...childs)
}
