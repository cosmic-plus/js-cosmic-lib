# cosmic-lib

cosmic-lib is a JavaScript implementation of the **CosmicLink protocol** that 
comes with a few useful additional tools.

## What are CosmicLinks?

CosmicLinks are normal URL or URI that contains a Stellar transaction encoded 
in their query. It allows to pass Stellar transaction to **any webpage** or 
**any software**. Here's an example on the https://cosmic.link website:

> <https://cosmic.link/?payment&amount=100&destination=tips*cosmic.link>

CosmicLinks use a simple syntax that allow to write any arbirtrary transaction:

> <https://cosmic.link/?transaction&operation=manageData&name=migrated&value=true&operation=setOptions&homeDomain=anywallet.org>

It can be used to pass transaction XDR as well:

> [https://cosmic.link/?xdr=AAAA...AA==&network=public](https://cosmic.link/?xdr=AAAAAL2ef/Z7FpGtgUvkKaEg3uvy9IH+T9chWSUhQILKTk/NAAAAZAEMX34AAAADAAAAAAAAAAAAAAABAAAAAAAAAAUAAAABAAAAAIQ/AS7GRUBBd96ykumKKUFE92+oiwRuJ7KXuvPwwTQWAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==&network=public)

While the **https://cosmic.link** website provides a convenient way to share 
transactions over social medias, emails and static documents, any 
wallet/service can issue or accept CosmicLinks. One big advantage of using 
queries is that they can be used to pass transactions without having to rely on 
any particular service.

This is a generalization of tools like Metamask for Ethereum, as it allows any 
service to communicate with any (compatible) wallet; And users to sign 
transactions from any service without ever divulgating private keys.

The ultimate goal of the CosmicLink protocol is to enable **cross-wallet 
applications** for Stellar.

## Installation

### Node / Yarn

* **NPM**: `npm install --save cosmic-lib`
* **Yarn**: `yarn add cosmic-lib`

In your script:

```js
const cosmiclib = require('cosmic-lib')
const CosmicLink = cosmiclib.CosmicLink
```

### Bower

```js
bower install cosmic-lib
```

In your HTML pages:

```HTML
  <script src="./bower_components/stellar-sdk/stellar-sdk.min.js"></script>
  <script src="./bower_components/cosmic-lib/cosmic-lib.js"></script>
```

### Web

```HTML
  <script src="https://unpkg.com/stellar-sdk/dist/stellar-sdk.min.js"></script>
  <script src="https://cosmic.plus/cosmic-lib/cosmic-lib.js"></script>
```

**Note**: For production release it is advised to serve your own copy of the 
libraries.

## Basic Usage

### Create a CosmicLink

#### From a New Transaction

The transaction builder is similar to the one provided by StellarSdk. 
Additionaly, it accepts federated addresses and offer syntactic sugar for 
memos, dates and assets.

```js
const cosmiclink = new CosmicLink({ memo: 'Demo', maxTime: '2019-01', network: 'test', ...moreTxFields })
  .addOperation('payment', { destination: 'tips*cosmic.link', amount: 10:  })
  .addOperation('changeTrust', { asset: 'CNY:admin*ripplefox.com' })
  .addOperation(...)
```

#### From an Existing Transaction

* From a StellarSdk Transaction: `new CosmicLink(transaction, { network: 'public'|'test'|passphrase })`
* From an XDR: `new CosmicLink(xdr, { network: 'public'|'test'|passphrase })`
* From a CosmicLink URI/query/JSON: `new CosmicLink(uri|query|json)`
* From a SEP-0007 link: `new CosmicLink(sep7)`

### Edit a CosmicLink

```js
cosmiclink.setTxFields({ memo: 'newMemo', source: null, sequence: null })
  .addOperation('manageData', { name: 'foo', value: 'bar'})
  .setOperation(1, 'mergeAccount', { destination: 'in*tempo.eu.com' })
  .setOperation(0, null)
```

### Get the Link

* Get the HTML link: `cosmiclink.htmlLink`
* Get the URI: `cosmiclink.uri`
* Get the query: `cosmiclink.query`

If your webpack contains a link HTML element with `id="cosmiclink"`, it will
automatically get updated with the latest CosmicLink URI.

### Display the Transaction

You'll probably want to load the StyleSheet for cosmic-lib first: `await 
cosmiclib.load.styles([URL])`. Then, you can get the HTML description from: 
`cosmiclink.htmlDescription`

If your webpage contains an HTML element with `id="cosmiclink_description"`, it 
will automatically get updated with the latest CosmicLink description.


### Convert to other formats

```js
console.log(cosmiclink.json)
console.log(cosmiclink.tdesc) // The most convenient format to manipulate transactions

await cosmiclink.lock({ network: ..., source: ...}) // Lock CosmicLink to a network & a source account
console.log(cosmiclink.transaction)
console.log(cosmiclink.xdr)
console.log(cosmiclink.sep7)
```

**Note**: If you parsed CosmicLink from an XDR/Transaction/SEP-0007 link you
don't need to use `cosmiclink.lock()` for conversion purpose.

### Sign & Send the Transaction

```js
await cosmiclink.lock({ network: ..., source: ...}) // Lock CosmicLink to a network & a source account
cosmiclink.sign(...keypair|preimage)
await cosmiclink.send()
```

**Note**: the transaction will automatically be transmitted to 
[StellarGuard](https://stellarguard.me) when relevant.

## Global configuration

`cosmiclib.config` allows to define globally a few parameters:

```js
cosmiclib.config.page = 'https://cosmic.link/'  // Base URI when generating links
cosmiclib.config.network = 'test'               // 'public' by default
cosmiclib.config.source = 'tips*cosmic.link'    // Undefined by default
```

You can also set the horizon node to use for a given network:

```js
cosmiclib.config.setupNetwork('test', 'https://horizon.example.org')
```

## Other Utilities

cosmic-lib exposes part of its underlying code as additional modules.

### Resolve

* Get the Server object for a network `cosmiclib.resolve.server('public'|'test'|passphrase)`
* Resolve a federated address: `await cosmiclib.resolve.address('tips*cosmic.link')`
* Resolve an account: `await cosmiclib.resolve.account('tips*cosmic.link')`
* Resolve transaction signers list: `await cosmiclib.resolve.txSignersList(transaction)`

### Signers Utils

Extends a StellarSdk Transaction object with convenient multi-signature 
utilities:

```js
cosmiclib.signersUtils.extends(transaction)
transaction.hasSigner('GB...DECX')
transaction.hasSigned('GB...DECX')
```

## Additional ressources

### Documentation

cosmic-lib packs more that showed in this brief presentation. Please take a
look at the manual:

 * [Complete documentation](https://cosmic.plus/cosmic-lib/doc/CosmicLink.html)
 * [Cosmic queries specification](https://cosmic.plus/cosmic-lib/doc/tutorial-specifications.html)
 * [Cosmic queries cheatsheet](https://cosmic.plus/cosmic-lib/doc/tutorial-cheatsheet2.html)
 * [Emitting CosmicLinks without this library](https://cosmic.plus/cosmic-lib/doc/tutorial-emitting.html)

### Support

* [Galactic Talk](https://galactictalk.org/d/1519-release-js-cosmic-lib-beta-1-stellar-transactions-into-url-and-qr)
* [Telegram](https://t.me/cosmiclink)
* [Stellar Slack](https://slack.stellar.org/): @Mister.Ticot

### Releases

This is the beta-2 release. The codebase is mature and few to no compatibility 
breaks are expected.

 * [Task list](https://github.com/cosmic-plus/node-cosmic-lib/blob/master/TODO.md)
 * [GitHub repository](https://github.com/cosmic-plus/node-cosmic-lib)
 * [NPM package](https://npmjs.com/cosmic-lib)
 * [Yarn package](https://yarn.pm/cosmic-lib)

### Related tools

 * [Demo page](https://cosmic.plus/cosmic-lib/demo.html)
 * [Debug page](https://cosmic.plus/cosmic-lib/debug.html)

### Related articles

* 26 Jul 2018: [Understanding Cosmic Links](https://medium.com/@mister.ticot/understanding-cosmic-links-ee2ace259671)
* 22 Jan 2018: [A standardized way of handling Stellar transactions](https://steemit.com/crypto/@mister.ticot/a-standardized-way-of-handling-stellar-transactions)


### Services that implement cosmic links

 * The Cosmic.Link website: <https://cosmic.link>
 * Stellar Authenticator: <https://stellar-authenticator.org>


## Contribute

cosmic-lib is a free software. You are very welcome to contribute by whatever 
means you'd like. Donation are also possible at 
[tips*cosmic.link](https://cosmic.link/?payment&memo=Donation&destination=tips*cosmic.link&amount=20)


## Thank you :)

Especially to: Torkus, Dhzam, Paul, Zac and Umbrel.
And to the Stellar Foundation for supporting my work.
