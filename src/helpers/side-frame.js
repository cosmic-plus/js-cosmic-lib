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
    this.show()
  }

  show () {
    if (!this.domNode.hidden) return

    // Timeout is required for transition to play.
    timeout(0).then(() => this.domNode.style.transform = "none")
    html.show(this.closeButton.domNode, this.domNode)

    return this.shadow.enable().then(() => {
      this.shadow.onclick = () => this.close()
      this.closeButton.domNode.onclick = () => this.close()
      this.trigger("show")
    })
  }

  hide () {
    if (this.domNode.hidden) return

    html.hide(this.closeButton.domNode)
    this.domNode.style.transform = "translateX(100%)"

    return this.shadow.disable().then(() => {
      html.hide(this.domNode)
      this.trigger("hide")
    })
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
  position: "fixed",
  zIndex: 1000,
  right: 0,
  top: 0,
  width: "30em",
  maxWidth: "100%",
  height: "100vh",
  border: "0.1em solid hsl(240, 10%, 75%)",
  background: "hsl(240, 40%, 98%)",
  backgroundImage: `url('${cosmicLinkIcon}')`,
  backgroundRepeat: "no-repeat",
  backgroundPosition: "center",
  backgroundSize: "12em 12em",
  padding: 0,
  transition: "transform 0.4s",
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
  zIndex: 1001,
  top: "0.1em",
  right: "0.1em",
  color: "hsl(0, 0%, 40%)",
  fontSize: "0.9em",
  fontWeight: "bold",
  cursor: "pointer",
  background: "hsl(0, 0%, 95%)",
  borderBottomLeftRadius: "0.1em",
  padding: "0.1em 0.3em"
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
