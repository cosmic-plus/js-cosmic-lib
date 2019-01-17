'use_strict'

const html = require('@cosmic-plus/jsutils/html')

const source = 'GBP7EQX652UPJJJRYFAPH64V2MHGUGFJNKJN7RNOPNSFIBH4BW6NSF45'
const secret = 'SAZMGMO2DUBRGQIXNHIEBRLUQOPC7SYLABFMC55JZVPXMZPBRXLMVKKV'
const keypair = StellarSdk.Keypair.fromSecret(secret)
const account1 = 'GBWYUHFOHJECKDLFNCPGPVU6XRDJIBT5BYF6VXZEDHWVQRCR4HZVCGPU'
const account2 = 'GBI6LRKMFJ5CXNIFYU3VQLQ7DUP5M4TQ6ONOYNV6SNUITIH4KFOMTTV4'
const account3 = 'GB6NJPLQ6ZQ6IQQTLIUIXEKPLWCB32HDVWWVE2KSU7LQKGY4JL4AITOV'
const account4 = 'GBQTHFN6MNU42FSWFOSXBTZI4YYHXC6WLC6RNQQUDNWYEAA4DVJ5QQ3A'
const accountMultiSig = 'GCAB6VK735PMBZGBO556VBOFMJ5LTALYHRTEPLTJW2IRDQF6SXLQVZJN'
const asset1 = 'ETH:GBDEVU63Y6NTHJQQZIKVTC23NWLQVP3WJ2RI2OTSJTNYOIGICST6DUXR'
const asset2 = 'CNY:admin*ripplefox.com'
const asset3 = 'EURT:GAP5LETOV6YIE62YAM56STDANPRDO7ZFDBGSNHJQIYGGKSMOZAHOOS2S'
const asset4 = 'XRP:GBXRPL45NPHCVMFFAYZVUVFFVKSIZ362ZXFP7I2ETNQ3QKZMFLPRDTD5'
const shasum = '4a3ec3730504983f960fb2df35a1d68d640ff55d151fa3128ca0fc707f86882e'
const txsum = '3389e9f0f1a65f19736cacf544c2e825313e8447f569233bb8db39aa607c1234'
const id = '18446744073709551615'
const bin = "ABCDEFGH"
const xdr = 'AAAAAEmlgXsVQpGcRhn0YhhktsW/7+GHTAhucc06I5zDTRQdAAAAZAAB7x0AAAACAAAAAAAAAAAAAAABAAAAAAAAAAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=='

const invalidKey = 'GBP7EQX652UPJJJRYFAPH64V2MHGUGFJNKJN7RNOPNSFIBH4BW6NSF54'

const tests = [
  /** * Transaction fields ***/
  ['bigTitle', 'Transaction fields'],
  ['query', '?inflation&network=test'],
  ['query', '?inflation&horizon=broken-url'],
  ['query', '?inflation&network=multisig&horizon=horizon-testnet.stellar.org'],
  ['query', '?inflation&callback=example.org'],
  ['query', '?inflation&source=' + accountMultiSig, { dontSign: 1 }],
  ['query', '?inflation&fee=500'],
  ['query', '?manageData&minTime=2017-12-12&maxTime=2030-12-12&name=test&value=true',
    {send: 1}],
  ['query', '?manageData&minTime=2017-12-12T06:05&name=test&value=true',
    {send: 1}],
  ['query', '?manageData&maxTime=2030-12-12T06:05+01:30&name=test&value=true',
    {loopbackQuery: '?manageData&maxTime=2030-12-12T04:35&name=test&value=true',
      send: 1}],
  ['query', '?inflation&memo=Hello_world!'],
  ['query', '?inflation&memo=base64:' + bin],
  ['query', '?inflation&memo=id:' + id],
  ['query', '?inflation&memo=hash:' + shasum],
  ['query', '?inflation&memo=return:' + shasum],

  /** * Stellar operations ***/
  ['bigTitle', 'Operations'],
  ['title', 'Account merge'],
  ['query', '?accountMerge&destination=' + account1],
  ['title', 'Allow trust'],
  ['query', '?allowTrust&trustor=' + account1 + '&assetCode=DIA&authorize=true',
    { loopbackQuery: '?allowTrust&trustor=GBWYUHFOHJECKDLFNCPGPVU6XRDJIBT5BYF6VXZEDHWVQRCR4HZVCGPU&assetCode=DIA' }],
  ['query', '?allowTrust&trustor=' + account1 + '&assetCode=DIA'],
  ['query', '?allowTrust&trustor=' + account1 + '&assetCode=DIA&authorize=false'],
  ['title', 'Bump Sequence'],
  ['query', '?bumpSequence&bumpTo=999999999'],
  ['title', 'Change trust'],
  ['query', '?changeTrust&asset=' + asset1],
  ['query', '?changeTrust&asset=' + asset1 + '&limit=0'],
  ['query', '?changeTrust&asset=' + asset1 + '&limit=1000'],
  ['title', 'Create account'],
  ['query', '?createAccount&destination=' + account1 + '&startingBalance=220'],
  ['title', 'Create passive offer'],
  ['query', '?createPassiveOffer&selling=' + asset2 + '&buying=' + asset1 + '&amount=10&price=50'],
  ['query', '?createPassiveOffer&buying=' + asset1 + '&amount=100&price=10'],
  ['query', '?createPassiveOffer&selling=' + asset1 + '&amount=100&price=0.1'],
  ['title', 'Inflation'],
  ['query', '?inflation'],
  ['title', 'Manage data'],
  ['query', '?manageData&name=mail&value=someone%40example.org'],
  ['query', '?manageData&name=code&value=base64:' + bin],
  ['query', '?manageData&name=address'],
  ['title', 'Manage offer'],
  ['query', '?manageOffer&selling=' + asset1 + '&buying=' + asset2 + '&amount=500&price=1:50',
    { loopbackQuery: '?manageOffer&selling=ETH:GBDEVU63Y6NTHJQQZIKVTC23NWLQVP3WJ2RI2OTSJTNYOIGICST6DUXR&buying=CNY:admin*ripplefox.com&amount=500&price=0.02' }],
  ['query', '?manageOffer&selling=' + asset2 + '&buying=' + asset1 + '&amount=500&price=1:25&offerId=12345',
    { loopbackQuery: '?manageOffer&selling=CNY:admin*ripplefox.com&buying=ETH:GBDEVU63Y6NTHJQQZIKVTC23NWLQVP3WJ2RI2OTSJTNYOIGICST6DUXR&amount=500&price=0.04&offerId=12345' }],
  ['query', '?manageOffer&selling=' + asset1 + '&amount=10&price=0.1'],
  ['query', '?manageOffer&selling=' + asset1 + '&amount=0&price=1&offerId=12345'],
  ['title', 'Path Payment'],
  ['query', '?pathPayment&sendAsset=' + asset1 + '&sendMax=20&destination=' + account1 + '&destAsset=' + asset2 + '&destAmount=200'],
  ['query', '?pathPayment&sendAsset=' + asset1 + '&sendMax=20&destination=' + account1 + '&destAmount=500&path=' + asset2 + ',' + asset3 + ',' + asset4],
  ['title', 'Payment'],
  ['query', '?payment&destination=' + account1 + '&asset=' + asset1 + '&amount=20'],
  ['query', '?payment&destination=' + account1 + '&amount=0.001'],
  ['title', 'setOptions'],
  ['query', '?setOptions'],
  ['query', '?setOptions&inflationDest=' + account1],
  ['query', '?setOptions&clearFlags=3'],
  ['query', '?setOptions&setFlags=4'],
  ['query', '?setOptions&clearFlags=4&setFlags=3'],
  ['query', '?setOptions&masterWeight=10'],
  ['query', '?setOptions&lowThreshold=1&medThreshold=5&highThreshold=8'],
  ['query', '?setOptions&signer=1:key:' + account1],
  ['query', '?setOptions&signer=0:key:' + account1],
  ['query', '?setOptions&signer=1:hash:' + shasum],
  ['query', '?setOptions&signer=0:hash:' + shasum],
  ['query', '?setOptions&signer=1:tx:' + txsum],
  ['query', '?setOptions&signer=0:tx:' + txsum],
  ['query', '?setOptions&homeDomain=cosmic.link'],
  ['query', '?setOptions&homeDomain='],

  /** * XDR conversion **/
  ['bigTitle', 'XDR conversion'],
  ['query', '?xdr=' + xdr, { dontSign: 1 }],
  ['query', '?xdr=' + xdr + '&stripSource&network=test', { dontSign: 1 }],
  ['query', '?xdr=' + xdr + '&stripSequence', { dontSign: 1 }],
  ['query', '?xdr=' + xdr + '&stripSignatures', { dontSign: 1 }],

  /** * Sending tests ***/
  ['bigTitle', 'Sending tests'],
  ['query', 'stellar://?manageData&name=name&value=Mister.Ticot', {send: 1}],
  ['query', "?manageData&name=planet&value=alert('pluton')", {send: 1}],
  ['query', '?manageData&name=other&value=spaces%20and%20UTF8%20%7B%C3%B0%E2%80%A6%C3%B0%7D',
    {send: 1}],
  ['query', '?setOptions&homeDomain=cosmic.link', {send: 1}],
  ['query', '?payment&destination=' + account1 + '&amount=0.00001', {send: 1}],

  /** * Error handling ***/
  ['bigTitle', 'Error handling'],
  ['title', 'Unknow operation'],
  ['query', '?something'],
  ['title', 'Unknow field'],
  ['query', '?inflation&weird=true'],
  ['title', 'Empty field'],
  ['query', '?manageData&name='],
  ['title', 'Wrong address'],
  ['query', '?payment&amount=1&destination=nobody*example.org'],
  ['query', '?payment&amount=1&destination=weird'],
  ['query', '?payment&amount=1&destination=' + invalidKey],
  ['query', '?inflation&source=nobody*example.org'],
  ['query', '?inflation&source=weird'],
  ['query', '?inflation&source=' + invalidKey],
  ['title', 'Wrong amount'],
  ['query', '?payment&amount=abc&destination=' + account1]
]

cosmicLib.config.network = 'test'
cosmicLib.config.source = source
cosmicLib.load.styles("cosmic-lib.css")

const CosmicLink = cosmicLib.CosmicLink

/*******************************************************************************
 * Page Layout
 */

const mainNode = html.grab('main')

async function debug () {
  makeNav()
  if (document.location.hash) {
    const number = +document.location.hash.substr(1)
    switchPage(number)
  }
}

let summary = {}

function makeNav () {
  let navNode = html.grab('nav')

  let count = 0
  let queryNum = 0

  tests.forEach(entry => {
    if (entry[0] === 'bigTitle') {
      if (count) summary[count].queryNum = queryNum
      count++
      const entryNode = html.create('div', '.page')
      summary[count] = { node: entryNode, tests: [] }
      html.append(navNode, html.create('a',
        { href: '#' + count, onclick: makePageSwitcher(count) },
        entry[1]
      ))
    } else {
      if (entry[0] === 'query') queryNum++
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
  section.status = 'run'
  for (let index in section.tests) {
    const entry = section.tests[index]
    switch (entry[0]) {
      case 'title':
        appendTitle(section.node, entry[1])
        break
      case 'query':
        await appendCosmicLink(section.node, entry[1], entry[2])
    }
  }
  section.status = 'done'
}

function appendTitle (parent, title) {
  let titleNode = html.create('h3', {}, title)
  html.append(parent, titleNode, html.create('hr'))
}

/*******************************************************************************
 * Cosmic link tests.
 */

async function appendCosmicLink (parent, query, options = {}) {
  const cosmicLink = new CosmicLink(query)

  html.append(
    parent,
    html.create('input', { value: query }),
    cosmicLink.htmlDescription,
    html.create('hr')
  )

  cosmicLink.debugNode = html.create('div', '.cosmiclib_debug')
  html.append(cosmicLink.htmlDescription, cosmicLink.debugNode)

  try {
    if (cosmicLink.status) throw new Error(cosmicLink.status)
    await checkCosmicLink(cosmicLink, options)
    await tryCosmicLink(cosmicLink, options)
  } catch (error) {
    console.error(error)
    html.append(cosmicLink.debugNode, html.create('div', '.debug_error', error))
    if (cosmicLink.json) {
      html.append(cosmicLink.debugNode, html.create('textarea', '.json', cosmicLink.json))
    }
  }
}

/**
 * Run conversion tests.
 */
async function checkCosmicLink (cosmicLink, options) {
  function append (...el) { html.append(cosmicLink.debugNode, ...el) }

  let conversionCheck = true
  const initialQuery = cosmicLink.query

  const json = testJsonConsistency(cosmicLink.json)
  if (json) {
    conversionCheck = false
    append(html.create('span', '.debug_error', 'Inconsistent JSON conversion'))
    append(html.create('textarea', '.json', cosmicLink.json))
    append(html.create('textarea', '.json', json))
  }

  const linkOpts = {}
  if (!cosmicLink.tdesc.sequence) linkOpts.stripSequence = true
  if (!cosmicLink.tdesc.source) linkOpts.stripSource = true
  if (cosmicLink.tdesc.network) linkOpts.network = cosmicLink.tdesc.network
  if (cosmicLink.tdesc.horizon) linkOpts.horizon = cosmicLink.tdesc.horizon
  if (cosmicLink.tdesc.callback) linkOpts.callback = cosmicLink.tdesc.callback

  await cosmicLink.lock()

  const query = testQueryConsistency(cosmicLink, initialQuery, linkOpts, options.loopbackQuery)
  if (query) {
    conversionCheck = false
    append(html.create('span', '.debug_error', 'Inconsistent Query conversion'))
    append(html.create('textarea', null, initialQuery))
    append(html.create('textarea', null, query))
  }

  const xdr = await testXdrConsistency(cosmicLink.xdr, linkOpts)
  if (xdr) {
    conversionCheck = false
    append(html.create('span', '.debug_error', 'Inconsistent XDR conversion'))
    append(html.create('textarea', null, cosmicLink.xdr))
    append(html.create('textarea', null, xdr))
  } else {
    append(html.create('textarea', null, cosmicLink.xdr))
  }

  if (conversionCheck) {
    const msg = html.create('span', '.debug_done', 'Conversion check: ok')
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
function testQueryConsistency (cosmicLink, query, options = {}, expectedLoopback) {
  const loopback = new CosmicLink(cosmicLink.xdr, options)
  loopback._query = loopback.query.replace('GAREELUB43IRHWEASCFBLKHURCGMHE5IF6XSE7EXDLACYHGRHM43RFOX', 'admin*ripplefox.com')
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
    const msg = html.create('div', '.debug_done', 'Validated by network')
    html.append(cosmicLink.htmlDescription, msg)
  }
}

/*******************************************************************************
 * Page styling
 */

function addStyle (string) {
  const style = html.create('style', { type: 'text/css' }, string)
  html.append(html.grab('head'), style)
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

