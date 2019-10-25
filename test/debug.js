"use strict"

const html = require("@cosmic-plus/domutils/es5/html")
const friendbot = require("@cosmic-plus/base/es5/friendbot")
const StellarSdk = window.StellarSdk
const cosmicLib = window.cosmicLib

const source = "GBP7EQX652UPJJJRYFAPH64V2MHGUGFJNKJN7RNOPNSFIBH4BW6NSF45"
const secret = "SAZMGMO2DUBRGQIXNHIEBRLUQOPC7SYLABFMC55JZVPXMZPBRXLMVKKV"
const keypair = StellarSdk.Keypair.fromSecret(secret)
const account1 = "GBWYUHFOHJECKDLFNCPGPVU6XRDJIBT5BYF6VXZEDHWVQRCR4HZVCGPU"
const accountMultiSig =
  "GCAB6VK735PMBZGBO556VBOFMJ5LTALYHRTEPLTJW2IRDQF6SXLQVZJN"
const asset1 = "ETH:GBDEVU63Y6NTHJQQZIKVTC23NWLQVP3WJ2RI2OTSJTNYOIGICST6DUXR"
const asset2 = "CNY:admin*ripplefox.com"
const asset3 = "EURT:GAP5LETOV6YIE62YAM56STDANPRDO7ZFDBGSNHJQIYGGKSMOZAHOOS2S"
const asset4 = "XRP:GBXRPL45NPHCVMFFAYZVUVFFVKSIZ362ZXFP7I2ETNQ3QKZMFLPRDTD5"
const shasum =
  "4a3ec3730504983f960fb2df35a1d68d640ff55d151fa3128ca0fc707f86882e"
const txsum = "3389e9f0f1a65f19736cacf544c2e825313e8447f569233bb8db39aa607c1234"
const id = "18446744073709551615"
const bin = "ABCDEFGH"
const xdr =
  "AAAAAEmlgXsVQpGcRhn0YhhktsW/7+GHTAhucc06I5zDTRQdAAAAZAAB7x0AAAACAAAAAAAAAAAAAAABAAAAAAAAAAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=="

const invalidKey = "GBP7EQX652UPJJJRYFAPH64V2MHGUGFJNKJN7RNOPNSFIBH4BW6NSF54"

const tests = [
  /** * Transaction fields ***/
  ["bigTitle", "Transaction fields"],
  ["query", "?type=inflation&network=test"],
  ["query", "?type=inflation&horizon=broken-url"],
  [
    "query",
    "?type=inflation&network=multisig&horizon=horizon-testnet.stellar.org"
  ],
  ["query", "?type=inflation&callback=example.org"],
  ["query", "?type=inflation&source=" + accountMultiSig, { dontSign: 1 }],
  ["query", "?type=inflation&fee=500"],
  [
    "query",
    "?type=manageData&minTime=2017-12-12&maxTime=2030-12-12&name=test&value=true",
    { send: 1 }
  ],
  [
    "query",
    "?type=manageData&minTime=2017-12-12T06:05&name=test&value=true",
    { send: 1 }
  ],
  [
    "query",
    "?type=manageData&maxTime=2030-12-12T06:05+01:30&name=test&value=true",
    {
      loopbackQuery:
        "?type=manageData&maxTime=2030-12-12T04:35&name=test&value=true",
      send: 1
    }
  ],
  ["query", "?type=setOptions&maxTime=+15", { send: 1 }],
  ["query", "?type=inflation&memo=Hello_world!"],
  ["query", "?type=inflation&memo=base64:" + bin],
  ["query", "?type=inflation&memo=id:" + id],
  ["query", "?type=inflation&memo=hash:" + shasum],
  ["query", "?type=inflation&memo=return:" + shasum],

  /** * Stellar operations ***/
  ["bigTitle", "Operations"],
  ["title", "Account merge"],
  ["query", "?type=accountMerge&destination=" + account1],
  ["title", "Allow trust"],
  [
    "query",
    "?type=allowTrust&trustor=" + account1 + "&assetCode=DIA&authorize=true",
    {
      loopbackQuery:
        "?type=allowTrust&trustor=GBWYUHFOHJECKDLFNCPGPVU6XRDJIBT5BYF6VXZEDHWVQRCR4HZVCGPU&assetCode=DIA"
    }
  ],
  ["query", "?type=allowTrust&trustor=" + account1 + "&assetCode=DIA"],
  [
    "query",
    "?type=allowTrust&trustor=" + account1 + "&assetCode=DIA&authorize=false"
  ],
  ["title", "Bump Sequence"],
  ["query", "?type=bumpSequence&bumpTo=999999999"],
  ["title", "Change trust"],
  ["query", "?type=changeTrust&asset=" + asset1],
  ["query", "?type=changeTrust&asset=" + asset1 + "&limit=0"],
  ["query", "?type=changeTrust&asset=" + asset1 + "&limit=1000"],
  ["title", "Create account"],
  [
    "query",
    "?type=createAccount&destination=" + account1 + "&startingBalance=220"
  ],
  ["title", "Create passive offer (backward compatibility)"],
  [
    "query",
    "?type=createPassiveOffer&buying=" + asset1 + "&amount=100&price=10"
  ],
  ["title", "Create passive sell offer"],
  [
    "query",
    "?type=createPassiveSellOffer&buying=" + asset1 + "&amount=100&price=10"
  ],
  [
    "query",
    "?type=createPassiveSellOffer&selling=" + asset1 + "&amount=100&price=0.1"
  ],
  [
    "query",
    "?type=createPassiveSellOffer&selling="
      + asset2
      + "&buying="
      + asset1
      + "&amount=10&price=50"
  ],
  ["title", "Inflation"],
  ["query", "?type=inflation"],
  ["title", "Manage data"],
  ["query", "?type=manageData&name=mail&value=someone%40example.org"],
  ["query", "?type=manageData&name=code&value=base64:" + bin],
  ["query", "?type=manageData&name=address"],
  ["title", "Manage buy offer"],
  [
    "query",
    "?type=manageBuyOffer&selling=" + asset1 + "&buyAmount=10&price=0.1"
  ],
  [
    "query",
    "?type=manageBuyOffer&selling="
      + asset1
      + "&buying="
      + asset2
      + "&buyAmount=500&price=1:50",
    {
      loopbackQuery:
        "?type=manageBuyOffer&selling=ETH:GBDEVU63Y6NTHJQQZIKVTC23NWLQVP3WJ2RI2OTSJTNYOIGICST6DUXR&buying=CNY:admin*ripplefox.com&buyAmount=500&price=0.02"
    }
  ],
  [
    "query",
    "?type=manageBuyOffer&selling="
      + asset2
      + "&buying="
      + asset1
      + "&buyAmount=500&price=1:25&offerId=12345",
    {
      loopbackQuery:
        "?type=manageBuyOffer&selling=CNY:admin*ripplefox.com&buying=ETH:GBDEVU63Y6NTHJQQZIKVTC23NWLQVP3WJ2RI2OTSJTNYOIGICST6DUXR&buyAmount=500&price=0.04&offerId=12345"
    }
  ],
  [
    "query",
    "?type=manageBuyOffer&buyAmount=0&offerId=12345",
    {
      loopbackQuery:
        "?type=manageBuyOffer&buying=XLM:GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF&buyAmount=0&price=1&offerId=12345"
    }
  ],
  ["title", "Manage offer (backward compatibility)"],
  ["query", "?type=manageOffer&selling=" + asset1 + "&amount=10&price=0.1"],
  ["title", "Manage sell offer"],
  ["query", "?type=manageSellOffer&selling=" + asset1 + "&amount=10&price=0.1"],
  [
    "query",
    "?type=manageSellOffer&selling="
      + asset1
      + "&buying="
      + asset2
      + "&amount=500&price=1:50",
    {
      loopbackQuery:
        "?type=manageSellOffer&selling=ETH:GBDEVU63Y6NTHJQQZIKVTC23NWLQVP3WJ2RI2OTSJTNYOIGICST6DUXR&buying=CNY:admin*ripplefox.com&amount=500&price=0.02"
    }
  ],
  [
    "query",
    "?type=manageSellOffer&selling="
      + asset2
      + "&buying="
      + asset1
      + "&amount=500&price=1:25&offerId=12345",
    {
      loopbackQuery:
        "?type=manageSellOffer&selling=CNY:admin*ripplefox.com&buying=ETH:GBDEVU63Y6NTHJQQZIKVTC23NWLQVP3WJ2RI2OTSJTNYOIGICST6DUXR&amount=500&price=0.04&offerId=12345"
    }
  ],
  [
    "query",
    "?type=manageSellOffer&amount=0&offerId=12345",
    {
      loopbackQuery:
        "?type=manageSellOffer&buying=XLM:GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF&amount=0&price=1&offerId=12345"
    }
  ],
  ["title", "Manage sell offer"],
  ["query", "?type=manageSellOffer&selling=" + asset1 + "&amount=10&price=0.1"],
  [
    "query",
    "?type=manageSellOffer&selling="
      + asset1
      + "&buying="
      + asset2
      + "&amount=500&price=1:50",
    {
      loopbackQuery:
        "?type=manageSellOffer&selling=ETH:GBDEVU63Y6NTHJQQZIKVTC23NWLQVP3WJ2RI2OTSJTNYOIGICST6DUXR&buying=CNY:admin*ripplefox.com&amount=500&price=0.02"
    }
  ],
  [
    "query",
    "?type=manageSellOffer&selling="
      + asset2
      + "&buying="
      + asset1
      + "&amount=500&price=1:25&offerId=12345",
    {
      loopbackQuery:
        "?type=manageSellOffer&selling=CNY:admin*ripplefox.com&buying=ETH:GBDEVU63Y6NTHJQQZIKVTC23NWLQVP3WJ2RI2OTSJTNYOIGICST6DUXR&amount=500&price=0.04&offerId=12345"
    }
  ],
  ["query", "?type=manageSellOffer&amount=0&offerId=12345"],
  ["title", "Path Payment Strict Receive (backward compatibility)"],
  [
    "query",
    "?type=pathPayment&sendAsset="
      + asset1
      + "&sendMax=20&destination="
      + account1
      + "&destAsset="
      + asset2
      + "&destAmount=200"
  ],
  ["title", "Path Payment Strict Receive"],
  [
    "query",
    "?type=pathPaymentStrictReceive&sendAsset="
      + asset1
      + "&sendMax=20&destination="
      + account1
      + "&destAsset="
      + asset2
      + "&destAmount=200"
  ],
  [
    "query",
    "?type=pathPaymentStrictReceive&sendAsset="
      + asset1
      + "&sendMax=20&destination="
      + account1
      + "&destAmount=500&path="
      + asset2
      + ","
      + asset3
      + ","
      + asset4
  ],
  ["title", "Payment"],
  [
    "query",
    "?type=payment&destination=" + account1 + "&asset=" + asset1 + "&amount=20"
  ],
  ["query", "?type=payment&destination=" + account1 + "&amount=0.001"],
  ["title", "setOptions"],
  ["query", "?type=setOptions"],
  ["query", "?type=setOptions&inflationDest=" + account1],
  ["query", "?type=setOptions&clearFlags=3"],
  ["query", "?type=setOptions&setFlags=4"],
  ["query", "?type=setOptions&clearFlags=4&setFlags=3"],
  ["query", "?type=setOptions&masterWeight=10"],
  ["query", "?type=setOptions&lowThreshold=1&medThreshold=5&highThreshold=8"],
  ["query", "?type=setOptions&signer=1:key:" + account1],
  ["query", "?type=setOptions&signer=0:key:" + account1],
  ["query", "?type=setOptions&signer=1:hash:" + shasum],
  ["query", "?type=setOptions&signer=0:hash:" + shasum],
  ["query", "?type=setOptions&signer=1:tx:" + txsum],
  ["query", "?type=setOptions&signer=0:tx:" + txsum],
  ["query", "?type=setOptions&homeDomain=cosmic.link"],
  ["query", "?type=setOptions&homeDomain="],

  /** * XDR conversion **/
  ["bigTitle", "XDR conversion"],
  ["query", "?xdr=" + xdr, { dontSign: 1 }],
  ["query", "?xdr=" + xdr + "&strip=source&network=test", { dontSign: 1 }],
  ["query", "?xdr=" + xdr + "&strip=sequence", { dontSign: 1 }],
  ["query", "?xdr=" + xdr + "&strip=signatures", { dontSign: 1 }],

  /** * Sending tests ***/
  ["bigTitle", "Sending tests"],
  [
    "query",
    "stellar://?type=manageData&name=name&value=Mister.Ticot",
    { send: 1 }
  ],
  ["query", "?type=manageData&name=planet&value=alert('pluton')", { send: 1 }],
  [
    "query",
    "?type=manageData&name=other&value=spaces%20and%20UTF8%20%7B%C3%B0%E2%80%A6%C3%B0%7D",
    { send: 1 }
  ],
  ["query", "?type=setOptions&homeDomain=cosmic.link", { send: 1 }],
  [
    "query",
    "?type=payment&destination=" + account1 + "&amount=0.00001",
    { send: 1 }
  ],

  /** * Error handling ***/
  ["bigTitle", "Error handling"],
  ["title", "Unknow operation"],
  ["query", "?type=something"],
  ["title", "Unknow field"],
  ["query", "?type=inflation&weird=true"],
  ["title", "Empty field"],
  ["query", "?type=manageData&name="],
  ["title", "Wrong address"],
  ["query", "?type=payment&amount=1&destination=nobody*example.org"],
  ["query", "?type=payment&amount=1&destination=weird"],
  ["query", "?type=payment&amount=1&destination=" + invalidKey],
  ["query", "?type=inflation&source=nobody*example.org"],
  ["query", "?type=inflation&source=weird"],
  ["query", "?type=inflation&source=" + invalidKey],
  ["title", "Wrong amount"],
  ["query", "?type=payment&amount=abc&destination=" + account1]
]

cosmicLib.config.network = "test"
cosmicLib.config.source = source
cosmicLib.load.styles("cosmic-lib.css")

const CosmicLink = cosmicLib.CosmicLink

/*******************************************************************************
 * Page Layout
 */

const mainNode = html.grab("main")

async function maybeFund () {
  const neededAccounts = [source, accountMultiSig, account1]
  neededAccounts.push(
    "GBE2LAL3CVBJDHCGDH2GEGDEW3C3737BQ5GAQ3TRZU5CHHGDJUKB2K4B"
  )
  for (const index in neededAccounts) {
    const account = neededAccounts[index]
    if (await cosmicLib.resolve.isAccountEmpty(account)) {
      await friendbot(account)
    }
  }
}

async function debug () {
  await maybeFund()
  makeNav()
  if (document.location.hash) {
    const number = +document.location.hash.substr(1)
    switchPage(number)
  }
}

let summary = {}

function makeNav () {
  let navNode = html.grab("nav")

  let count = 0
  let queryNum = 0

  tests.forEach(entry => {
    if (entry[0] === "bigTitle") {
      if (count) summary[count].queryNum = queryNum
      count++
      const entryNode = html.create("div", ".page")
      summary[count] = { node: entryNode, tests: [] }
      html.append(
        navNode,
        html.create(
          "a",
          { href: "#" + count, onclick: makePageSwitcher(count) },
          entry[1]
        )
      )
    } else {
      if (entry[0] === "query") queryNum++
      summary[count].tests.push(entry)
    }
  })
}

function makePageSwitcher (number) {
  return () => switchPage(number)
}

function switchPage (number) {
  const section = summary[number]
  html.clear(mainNode)
  html.append(mainNode, section.node)
  if (!section.status) runSection(number)
}

async function runSection (number) {
  const section = summary[number]
  section.status = "run"
  for (let index in section.tests) {
    const entry = section.tests[index]
    switch (entry[0]) {
    case "title":
      appendTitle(section.node, entry[1])
      break
    case "query":
      await appendCosmicLink(section.node, entry[1], entry[2])
    }
  }
  section.status = "done"
}

function appendTitle (parent, title) {
  let titleNode = html.create("h3", {}, title)
  html.append(parent, titleNode, html.create("hr"))
}

/*******************************************************************************
 * Cosmic link tests.
 */

async function appendCosmicLink (parent, query, options = {}) {
  const cosmicLink = new CosmicLink(query)

  html.append(
    parent,
    html.create("input", { value: query }),
    cosmicLink.htmlDescription,
    html.create("hr")
  )

  cosmicLink.debugNode = html.create("div", ".cosmiclib_debug")
  html.append(cosmicLink.htmlDescription, cosmicLink.debugNode)

  try {
    if (cosmicLink.status) throw new Error(cosmicLink.status)
    await checkCosmicLink(cosmicLink, options)
    await tryCosmicLink(cosmicLink, options)
  } catch (error) {
    console.error(error)
    html.append(cosmicLink.debugNode, html.create("div", ".debug_error", error))
    if (cosmicLink.json) {
      html.append(
        cosmicLink.debugNode,
        html.create("textarea", ".json", cosmicLink.json)
      )
    }
  }
}

/**
 * Run conversion tests.
 */
async function checkCosmicLink (cosmicLink, options) {
  function append (...el) {
    html.append(cosmicLink.debugNode, ...el)
  }

  let conversionCheck = true
  const initialQuery = cosmicLink.query

  const json = testJsonConsistency(cosmicLink.json)
  if (json) {
    conversionCheck = false
    append(html.create("span", ".debug_error", "Inconsistent JSON conversion"))
    append(html.create("textarea", ".json", cosmicLink.json))
    append(html.create("textarea", ".json", json))
  }

  const linkOpts = {}
  if (!cosmicLink.tdesc.sequence) linkOpts.strip = "sequence"
  if (!cosmicLink.tdesc.source) linkOpts.strip = "source"
  if (cosmicLink.tdesc.network) linkOpts.network = cosmicLink.tdesc.network
  if (cosmicLink.tdesc.horizon) linkOpts.horizon = cosmicLink.tdesc.horizon
  if (cosmicLink.tdesc.callback) linkOpts.callback = cosmicLink.tdesc.callback

  await cosmicLink.lock()

  const query = testQueryConsistency(
    cosmicLink,
    initialQuery,
    linkOpts,
    options.loopbackQuery
  )
  if (query) {
    conversionCheck = false
    append(html.create("span", ".debug_error", "Inconsistent Query conversion"))
    append(html.create("textarea", null, initialQuery))
    append(html.create("textarea", null, query))
  }

  const xdr = await testXdrConsistency(cosmicLink.xdr, linkOpts)
  if (xdr) {
    conversionCheck = false
    append(html.create("span", ".debug_error", "Inconsistent XDR conversion"))
    append(html.create("textarea", null, cosmicLink.xdr))
    append(html.create("textarea", null, xdr))
  } else {
    append(html.create("textarea", null, cosmicLink.xdr))
  }

  if (conversionCheck) {
    const msg = html.create("span", ".debug_done", "Conversion check: ok")
    html.append(cosmicLink.htmlDescription, msg)
  }
}

/**
 * Test if JSON is constistent over JSON -> query -> JSON conversion.
 */
function testJsonConsistency (json) {
  const query = new CosmicLink(json).query
  const loopback = new CosmicLink(query)
  if (json !== loopback.json) return loopback.json
}

/**
 * Test if Query is consistent over query -> XDR -> query.
 * The tested queries are ordered in a way that prevent false negative.
 */
function testQueryConsistency (
  cosmicLink,
  query,
  options = {},
  expectedLoopback
) {
  const loopback = new CosmicLink(cosmicLink.xdr, options)
  loopback._query = loopback.query.replace(
    "GAREELUB43IRHWEASCFBLKHURCGMHE5IF6XSE7EXDLACYHGRHM43RFOX",
    "admin*ripplefox.com"
  )
  if (!expectedLoopback) expectedLoopback = query
  if (expectedLoopback !== loopback.query) return loopback.query
}

/**
 * Test if XDR is consistent over XDR -> query -> XDR conversion.
 */
async function testXdrConsistency (xdr, options = {}) {
  const query = new CosmicLink(xdr, options).query
  const loopback = await new CosmicLink(query).lock()
  if (xdr !== loopback.xdr) return loopback.xdr
}

/**
 * Test sign & send if requested in options.
 */
async function tryCosmicLink (cosmicLink, options) {
  if (!options.dontSign) cosmicLink.sign(keypair)
  if (options.send) {
    await cosmicLink.send()
    const msg = html.create("div", ".debug_done", "Validated by network")
    html.append(cosmicLink.htmlDescription, msg)
  }
}

/*******************************************************************************
 * Page styling
 */

function addStyle (string) {
  const style = html.create("style", { type: "text/css" }, string)
  html.append(html.grab("head"), style)
}

addStyle(`
  html { font-size: 1.2em; font-family: "Trebuchet MS", Helvetica, sans-serif; }
  body { max-width: 40em; margin: auto; }
  nav { display: block; margin: auto; }
  nav a { display: inline-block; margin: 1em; }
  footer { text-align: right; }
  hr { margin: 1em; background: black; }
  input { width: 100%; }
  textarea { width: 100%; height: 5em; }
  .json { height: 10em; }
  .debug_done { color: mediumseagreen; }
  .debug_error { color: tomato; }
`)

// Trigger the lib once page is loaded.
document.body.onload = debug
