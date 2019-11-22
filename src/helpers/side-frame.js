"use strict"
/**
 * Signing Side Frame
 *
 * @private
 */
const html = require("@cosmic-plus/domutils/es5/html")
const Observable = require("@cosmic-plus/jsutils/es5/observable")
const { timeout } = require("@cosmic-plus/jsutils/es5/misc")

const ClickWall = require("./click-wall")

const cosmicLinkIcon = require("../../bundled/cosmic-link.svg")

/**
 * Class
 */

class SideFrame extends Observable {
  constructor (url) {
    super()

    if (SideFrame.current) SideFrame.current.close()
    SideFrame.current = this

    this.shadow = makeShadow()
    this.closeButton = new SideFrame.CloseButton()

    this.domNode = html.create("iframe", {
      title: "Signing Frame",
      src: url,
      sandbox: "allow-same-origin allow-scripts allow-forms allow-popups",
      hidden: true
    })
    Object.assign(this.domNode.style, SideFrame.style)
    this.domNode.style.transform = "translateX(100%)"

    html.append(document.body, this.closeButton, this.domNode)
    this.closeButton.domNode.style.zIndex = +this.getRealZIndex() + 1

    this.show()
  }

  show () {
    if (!this.domNode.hidden) return
    html.show(this.domNode)

    // That timeout is required for transition to play well.
    this.setTransition(250, "cubic-bezier(0, 0, 0.2, 1)")
    timeout(5).then(() => this.domNode.style.transform = "none")

    return this.shadow.enable().then(() => {
      this.shadow.onclick = () => this.close()
      html.show(this.closeButton.domNode)
      this.closeButton.domNode.onclick = () => this.close()
      this.trigger("show")
    })
  }

  hide () {
    if (this.domNode.hidden) return
    html.hide(this.closeButton.domNode)

    this.setTransition(200, "cubic-bezier(0.4, 0, 1, 1)")
    this.domNode.style.transform = "translateX(100%)"

    return this.shadow.disable().then(() => {
      html.hide(this.domNode)
      this.trigger("hide")
    })
  }

  setTransition (delay, ease) {
    const transition = `transform ${delay}ms ${ease}`
    this.domNode.style.transition = transition
    this.shadow.domNode.style.transition = transition
    this.shadow.delay = delay
  }

  close () {
    SideFrame.current = null
    this.hide().then(() => {
      html.destroy(this.domNode)
      html.destroy(this.closeButton.domNode)
      this.shadow.destroy()

      this.trigger("close")
      this.destroy()
    })
  }

  getRealZIndex () {
    return document.defaultView
      .getComputedStyle(this.domNode)
      .getPropertyValue("z-index")
  }
}

/**
 * Event
 */

window.addEventListener("message", event => {
  const frameWindow =
    SideFrame.current && SideFrame.current.domNode.contentWindow

  if (event.source === frameWindow) {
    switch (event.data) {
    case "show":
      SideFrame.current.show()
      break
    case "hide":
      SideFrame.current.hide()
      break
    case "close":
      SideFrame.current.close()
      break
    }
  }
})

/**
 * Frame style
 */

SideFrame.style = {
  boxSizing: "border-box",
  position: "fixed",
  zIndex: 1000,
  right: 0,
  top: 0,
  width: "30em",
  minWidth: "38%",
  maxWidth: "100%",
  height: "100vh",

  border: 0,
  borderTop: "2em solid hsl(240, 40%, 98%)",
  boxShadow:
    "0px 7px 10px 1px rgba(0, 0, 0, 0.14), 0px 2px 16px 1px rgba(0, 0, 0, 0.12)",
  background: "hsl(240, 40%, 98%)",
  backgroundImage: `url('${cosmicLinkIcon}')`,
  backgroundRepeat: "no-repeat",
  backgroundPosition: "center",
  backgroundSize: "12em 12em",

  willChange: "transform"
}

/**
 * Closing button
 */

SideFrame.CloseButton = class CloseButton {
  constructor () {
    this.domNode = html.create("span", { hidden: true }, "× Close")
    Object.assign(this.domNode.style, SideFrame.CloseButton.style)
  }
}

SideFrame.CloseButton.style = {
  position: "fixed",
  top: "0.1em",
  right: "0.1em",
  width: "29.8em",
  minWidth: "38%",
  maxWidth: "100%",
  lineHeight: "1.8em",

  color: "hsl(0, 0%, 40%)",
  fontWeight: "bold",
  cursor: "pointer",
  textAlign: "center"
}

/**
 * Shadow Layer
 */

function makeShadow () {
  return new ClickWall({
    scrollbar: "hide",
    opacity: 0.3,
    delay: 400
  })
}

/**
 * Export
 */

module.exports = SideFrame
