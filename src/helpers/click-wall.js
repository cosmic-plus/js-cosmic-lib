"use strict"
/**
 * Overlay that prevent user interaction
 *
 * @private
 */
const html = require("@cosmic-plus/domutils/es5/html")
const { timeout } = require("@cosmic-plus/jsutils/es5/misc")

/**
 * Definition
 */

class ClickWall {
  constructor (params = {}) {
    this.domNode = html.create("div", {
      className: "ClickWall",
      onclick: () => this.click(),
      hidden: true
    })

    Object.assign(this.domNode.style, ClickWall.style)
    html.append(document.body, this.domNode)

    this.onclick = params.onclick
    this.scrollbar = params.scrollbar
    this.opacity = params.opacity
    this.delay = params.delay || ClickWall.delay
  }

  click () {
    if (this.isEnabled && this.onclick) this.onclick()
  }

  async enable () {
    // Scrollbar hidding.
    if (this.scrollbar === "hide") {
      this.htmlOverflow = document.documentElement.style.overflow
      this.bodyOverflow = document.body.style.overflow
      document.documentElement.style.overflow = "hidden"
      document.body.style.overflow = "hidden"
    }

    // Fade in.
    html.show(this.domNode)
    if (this.opacity) await this.setOpacity(this.opacity)
    this.isEnabled = true
  }

  async disable () {
    // Handle scrollbar hidding.
    if (this.scrollbar === "hide") {
      document.documentElement.style.overflow = this.htmlOverflow
      document.body.style.overflow = this.bodyOverflow
    }

    // Fade out.
    this.isEnabled = false
    if (this.opacity) await this.setOpacity(0)
    html.hide(this.domNode)
  }

  async destroy () {
    await this.disable()
    html.destroy(this.domNode)
  }

  async setOpacity (opacity = this.opacity) {
    await timeout(0)
    Object.assign(this.domNode.style, {
      transition: `opacity ${this.delay}ms`,
      opacity
    })
    return timeout(this.delay)
  }
}

/**
 * Configuration
 */

ClickWall.delay = 500

ClickWall.style = {
  position: "fixed",
  zIndex: 999,
  top: 0,
  left: 0,
  width: "100%",
  height: "100%",
  background: "#000",
  opacity: 0,
  willChange: "opacity"
}

/**
 * Export
 */
module.exports = ClickWall
