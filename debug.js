'use_strict'

const node = require('./node.js')
const CosmicLink = cosmicLib.CosmicLink

const user = 'GBP7EQX652UPJJJRYFAPH64V2MHGUGFJNKJN7RNOPNSFIBH4BW6NSF45'
const secret = 'SAZMGMO2DUBRGQIXNHIEBRLUQOPC7SYLABFMC55JZVPXMZPBRXLMVKKV'
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
const xdr = 'AAAAAPNZplGf6IuHluM86bq4GjGnQOoy5+cL4BlCi8fjUaOvAAAAZACL7QgAAAABAAAAAAAAAAAAAAABAAAAAAAAAAkAAAAAAAAAAeNRo68AAABAruAWxO6KiC3Q3K+icSYVrKgrseIh3190V1+82d0CA90ycZ/hjxgqXufv00WStBfRP85fRHDzCwdzPNvy6GeRDQ=='

const invalidKey = 'GBP7EQX652UPJJJRYFAPH64V2MHGUGFJNKJN7RNOPNSFIBH4BW6NSF54'

const tests = [
  /** * Transaction fields ***/
  ['bigTitle', 'Transaction fields'],
  ['url', 'https://cosmic.link/?inflation&network=test'],
  ['url', 'https://cosmic.link/?inflation&source=' + accountMultiSig,
    { dontSign: 1 }],
  ['url', 'https://cosmic.link/?inflation&fee=500'],
  ['url', 'https://cosmic.link/?manageData&name=test&value=true&minTime=2017-12-12&maxTime=2018-12-12',
    {send: 1}],
  ['url', 'https://cosmic.link/?manageData&name=test&value=true&minTime=2017-12-12T06:05Z',
    {send: 1}],
  ['url', 'https://cosmic.link/?manageData&name=test&value=true&maxTime=2018-12-12T06:05+01:30',
    {send: 1}],
  ['url', 'https://cosmic.link/?inflation&memo=text:Hello_world!'],
  ['url', 'https://cosmic.link/?inflation&memo=id:' + id],
  ['url', 'https://cosmic.link/?inflation&memo=hash:' + shasum],
  ['url', 'https://cosmic.link/?inflation&memo=return:' + shasum],

  /** * Stellar operations ***/
  ['bigTitle', 'Operations'],
  ['title', 'Account merge'],
  ['url', 'https://cosmic.link/?accountMerge&destination=' + account1],
  ['title', 'Allow trust'],
  ['url', 'https://cosmic.link/?allowTrust&authorize=true&assetCode=DIA&trustor=' + account1],
  ['url', 'https://cosmic.link/?allowTrust&assetCode=DIA&trustor=' + account1],
  ['url', 'https://cosmic.link/?allowTrust&authorize=false&assetCode=DIA&trustor=' + account1],
  ['title', 'Change trust'],
  ['url', 'https://cosmic.link/?changeTrust&asset=' + asset1],
  ['url', 'https://cosmic.link/?changeTrust&limit=0&asset=' + asset1],
  ['url', 'https://cosmic.link/?changeTrust&limit=1000&asset=' + asset1],
  ['title', 'Create account'],
  ['url', 'https://cosmic.link/?createAccount&destination=' + account1 + '&startingBalance=220'],
  ['title', 'Create passive offer'],
  ['url', 'https://cosmic.link/?createPassiveOffer&buying=' + asset1 + '&selling=' + asset2 + '&amount=10&price=50'],
  ['url', 'https://cosmic.link/?createPassiveOffer&buying=' + asset1 + '&selling=' + asset2 + '&amount=10&price=50:1'],
  ['url', 'https://cosmic.link/?createPassiveOffer&buying=' + asset1 + '&amount=100&price=10'],
  ['url', 'https://cosmic.link/?createPassiveOffer&selling=' + asset1 + '&amount=100&price=0.1'],
  ['title', 'Inflation'],
  ['url', 'https://cosmic.link/?inflation'],
  ['title', 'Manage data'],
  ['url', 'https://cosmic.link/?manageData&name=mail&value=someone@example.org'],
  ['url', 'https://cosmic.link/?manageData&name=address'],
  ['title', 'Manage offer'],
  ['url', 'https://cosmic.link/?manageOffer&selling=' + asset1 + '&buying=' + asset2 + '&amount=500&price=1:50'],
  ['url', 'https://cosmic.link/?manageOffer&buying=' + asset1 + '&selling=' + asset2 + '&amount=500&price=1:25&offerId=12345'],
  ['url', 'https://cosmic.link/?manageOffer&selling=' + asset1 + '&amount=10&price=0.1'],
  ['title', 'Path Payment'],
  ['url', 'https://cosmic.link/?pathPayment&sendAsset=' + asset1 + '&sendMax=20&destination=' + account1 + '&destAsset=' + asset2 + '&destAmount=200'],
  ['url', 'https://cosmic.link/?pathPayment&sendAsset=' + asset1 + '&sendMax=20&destination=' + account1 + '&destAmount=500&path=' + asset2 + ',' + asset3 + ',' + asset4],
  ['title', 'Payment'],
  ['url', 'https://cosmic.link/?payment&destination=' + account1 + '&amount=20&asset=' + asset1],
  ['url', 'https://cosmic.link/?payment&destination=' + account1 + '&amount=0.001'],
  ['title', 'setOptions'],
  ['url', 'https://cosmic.link/?setOptions'],
  ['url', 'https://cosmic.link/?setOptions&inflationDest=' + account1],
  ['url', 'https://cosmic.link/?setOptions&clearFlags=3'],
  ['url', 'https://cosmic.link/?setOptions&setFlags=4'],
  ['url', 'https://cosmic.link/?setOptions&clearFlags=4&setFlags=3'],
  ['url', 'https://cosmic.link/?setOptions&masterWeight=10'],
  ['url', 'https://cosmic.link/?setOptions&lowThreshold=1&medThreshold=5&highThreshold=8'],
  ['url', 'https://cosmic.link/?setOptions&signer=1:key:' + account1],
  ['url', 'https://cosmic.link/?setOptions&signer=0:key:' + account1],
  ['url', 'https://cosmic.link/?setOptions&signer=1:hash:' + shasum],
  ['url', 'https://cosmic.link/?setOptions&signer=0:hash:' + shasum],
  ['url', 'https://cosmic.link/?setOptions&signer=1:tx:' + txsum],
  ['url', 'https://cosmic.link/?setOptions&signer=0:tx:' + txsum],
  ['url', 'https://cosmic.link/?setOptions&homeDomain=cosmic.link'],
  ['url', 'https://cosmic.link/?setOptions&homeDomain='],

  /** * XDR conversion **/
  ['bigTitle', 'XDR conversion'],
  ['url', 'https://cosmic.link/?xdr=' + xdr, { dontSign: 1 }],
  ['url', 'https://cosmic.link/?xdr=' + xdr + '&stripSource&network=test',
    { dontSign: 1 }],
  ['url', 'https://cosmic.link/?xdr=' + xdr + '&stripSequence',
    { dontSign: 1 }],
  ['url', 'https://cosmic.link/?xdr=' + xdr + '&stripSignatures',
    { dontSign: 1 }],


  /** * Sending tests ***/
  ['bigTitle', 'Sending tests'],
  ['url', 'stellar://?manageData&name=name&value=Mister.Ticot',
    {send: 1}],
  ['url', "https://cosmic.link/?manageData&name=planet&value=alert('pluton')",
    {send: 1}],
  ['url', 'https://cosmic.link/?manageData&name=other&value=spaces%20and%20UTF8%20%7B%C3%B0%E2%80%A6%C3%B0%7D',
    {send: 1}],
  ['url', 'https://cosmic.link/?setOptions&homeDomain=cosmic.link',
    {send: 1}],
  ['url', 'https://cosmic.link/?payment&amount=0.00001&destination=' + account1,
    {send: 1}],

  /** * Error handling ***/
  ['bigTitle', 'Error handling'],
  ['title', 'Unknow operation'],
  ['url', 'https://cosmic.link/?something'],
  ['title', 'Unknow field'],
  ['url', 'https://cosmic.link/?inflation&weird=true'],
  ['title', 'Empty field'],
  ['url', 'https://cosmic.link/?manageData&name='],
  ['title', 'Wrong address'],
  ['url', 'https://cosmic.link/?payment&amount=1&destination=nobody*example.org'],
  ['url', 'https://cosmic.link/?payment&amount=1&destination=weird'],
  ['url', 'https://cosmic.link/?payment&amount=1&destination=' + invalidKey],
  ['url', 'https://cosmic.link/?inflation&source=nobody*example.org'],
  ['url', 'https://cosmic.link/?inflation&source=weird'],
  ['url', 'https://cosmic.link/?inflation&source=' + invalidKey],
  ['title', 'Wrong amount'],
  ['url', 'https://cosmic.link/?payment&amount=abc&destination=' + account1]
]

const mainNode = node.grab('main')

export async function debug () {
  makeNav()
  if (document.location.hash) {
    const number = +document.location.hash.substr(1)
    switchPage(number)
  }
}

let summary = {}

function makeNav () {
  let navNode = node.grab('nav')

  let count = 0
  let urlNum = 0

  tests.forEach(entry => {
    if (entry[0] === 'bigTitle') {
      if (count) summary[count].urlNum = urlNum
      count++
      const entryNode = node.create('div', '.page')
      summary[count] = { node: entryNode, tests: [] }
      node.append(navNode, node.create('a',
        { href: '#' + count, onclick: makePageSwitcher(count) },
        entry[1]
      ))
    } else {
      if (entry[0] === 'url') urlNum++
      summary[count].tests.push(entry)
    }
  })
}

function makePageSwitcher (number) {
  return () => switchPage(number)
}

function switchPage (number) {
  const section = summary[number]
  node.clear(mainNode)
  node.append(mainNode, section.node)
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
      case 'url':
        await appendCosmicLink(section.node, entry[1], entry[2])
    }
  }
  section.status = 'done'
}

function appendTitle (parent, title) {
  let titleNode = node.create('h3', {}, title)
  node.append(parent, titleNode, node.create('hr'))
}

async function appendCosmicLink (parent, url, options = {}) {
  const cosmicLink = new CosmicLink(url, 'test', user)

  node.append(
    parent,
    node.create('input', { value: url}),
    //~ node.create('pre', {}, url),
    cosmicLink.htmlNode,
    node.create('hr')
  )

  cosmicLink.debugNode = node.create('div', '.CL_debug')
  node.append(cosmicLink.htmlNode, cosmicLink.debugNode)

  cosmicLink.debugNode.style.display = 'none'
  try {
    await checkCosmicLink(cosmicLink, options)
    await tryCosmicLink(cosmicLink, options)
  } catch (error) {
    console.log(error)
    cosmicLink.debugNode.style.display = 'block'
    node.append(cosmicLink.debugNode,
      node.create('div', '.debug_error', error)
    )
  }
}

async function checkCosmicLink (cosmicLink, options) {
  function append (...el) { node.append(cosmicLink.debugNode, ...el) }

  const xdr = await cosmicLink.getXdr()
  append(node.create('textarea', {}, xdr))

  const cLinkReverse = new CosmicLink(xdr)
  const json = await cLinkReverse.getJson()
  append(node.create('pre', {}, json))
  const uri2 = await cLinkReverse.getUri()

  const cLinkLoopback = new CosmicLink(uri2, 'test', user)
  const xdr2 = await cLinkLoopback.getXdr()

  if (xdr !== xdr2) {
    append(node.create('textarea', {}, xdr2))
    throw new Error('Loopback XDR differ from original')
  } else {
    node.append(cosmicLink.htmlNode,
      node.create('div', '.debug_done', 'Conversion check: ok'))
  }
}

async function tryCosmicLink (cosmicLink, options) {
  if (!options.dontSign) await cosmicLink.sign(secret)
  if (options.send) {
    await cosmicLink.send()
    node.append(cosmicLink.htmlNode,
      node.create('div', '.debug_done', 'Validated by network'))
  }
}

function addStyle (string) {
  const style = node.create('style', { type: 'text/css' }, string)
  node.append(node.grab('head'), style)
}

addStyle(`
  nav { display: block; margin: auto; }
  nav a { display: inline-block; margin: 1em; }
  footer { text-align: right; }
  input { width: 100%; }
  textarea { width: 100%; rows: 3; }
  .debug_done { color: mediumseagreen; }
  .debug_error { color: tomato; }
`)
