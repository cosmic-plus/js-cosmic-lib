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
const cosmicLib = require('cosmic-lib')
const CosmicLink = cosmicLib.CosmicLink
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
  <script src="https://cosmic.plus/stellar-sdk/stellar-sdk.min.js"></script>
  <script src="https://cosmic.plus/cosmic-lib/cosmic-lib.js"></script>
```

**Note**: For production release it is advised to serve your own copy of the
libraries.

## Basic Usage

### Create a CosmicLink

#### New Transaction

The transaction builder is similar to the one provided by StellarSdk.
Additionaly, it accepts federated addresses and offer syntactic sugar for
memos, dates and assets.

```js
const cosmicLink = new CosmicLink({ network: 'test', memo: 'Demo', maxTime: '2019-01' })
  .addOperation('payment', { destination: 'tips*cosmic.link', amount: 10 }) // XLM is implied
  .addOperation('changeTrust', { asset: 'CNY:admin*ripplefox.com' }) // Max limit is implied
  .addOperation(...)
```

#### From an Existing Transaction

* From a StellarSdk Transaction: `new CosmicLink(transaction, { network: 'public'|'test' })`
* From an XDR: `new CosmicLink(xdr, { network: 'public'|'test' })`
* From a CosmicLink URI/query: `new CosmicLink(uri|query)`
* From a SEP-0007 link: `new CosmicLink(sep7)`

### Edit a CosmicLink

* Change transaction fields: `cosmicLink.setTxFields(parameters)`
* Add operation: `cosmicLink.addOperation(name, parameters)`
* Set operation: `cosmicLink.setOperation(index, name, parameters)`
* Remove operation: `cosmicLink.setOperation(index, null)`

**Example:**

```js
cosmicLink.setTxFields({ memo: 'newMemo', source: null, sequence: null })
  .addOperation('manageData', { name: 'foo', value: 'bar'})
  .setOperation(1, 'mergeAccount', { destination: 'in*tempo.eu.com' })
  .setOperation(0, null)
```

### Get the Link

* Get the HTML link element: `cosmicLink.htmlLink`
* Get the URI: `cosmicLink.uri`
* Get the query: `cosmicLink.query`

If your webpage contains an HTML link element with `id="cosmiclink"`, it will
automatically get updated with the latest CosmicLink URI.

### Display the Transaction

You'll probably want to load the StyleSheet for cosmic-lib first:

```js
await cosmicLib.load.styles()
```
Then, you can get the HTML description elememt at: `cosmicLink.htmlDescription`.

If your webpage contains an HTML element with `id="cosmiclink_description"`, it
will automatically get updated with the latest CosmicLink description.


### Formats conversion

```js
console.log(cosmicLink.json)
console.log(cosmicLink.tdesc) // The most convenient format to manipulate transactions

// Lock CosmicLink to a network & a source account to compute its Transaction & XDR.
await cosmicLink.lock({ network: ..., source: ...})
console.log(cosmicLink.transaction)
console.log(cosmicLink.xdr)
console.log(cosmicLink.sep7)
```

**Note**: If you parsed CosmicLink from an XDR/Transaction/SEP-0007 link you
don't need to use `cosmicLink.lock()` for conversion purpose.

### Sign & Send the Transaction

```js
// Lock CosmicLink to a network & a source account to fetch signers data.
await cosmicLink.lock({ network: ..., source: ...})
cosmicLink.sign(...keypair|preimage)
await cosmicLink.send()
```

**Note**: the transaction will automatically be transmitted to
[StellarGuard](https://stellarguard.me) when relevant.

## Global configuration

`cosmicLib.config` allows to define globally a few parameters:

```js
cosmicLib.config.page = 'https://cosmic.link/'  // Base URI when generating links
cosmicLib.config.network = 'test'               // 'public' by default
cosmicLib.config.source = 'tips*cosmic.link'    // Undefined by default
```

You can also set the horizon node to use for a given network:

```js
cosmicLib.config.setupNetwork('test', 'https://horizon.example.org')
```

## Other Utilities

cosmic-lib exposes part of its underlying code as additional modules.

### Resolve

* Get the Server object for a network `cosmicLib.resolve.server('public'|'test'|passphrase)`
* Resolve a federated address: `await cosmicLib.resolve.address('tips*cosmic.link')`
* Resolve an account: `await cosmicLib.resolve.account('tips*cosmic.link')`
* Resolve transaction signers list: `await cosmicLib.resolve.txSignersList(transaction)`

### Signers Utils

Extends a StellarSdk Transaction object with convenient multi-signature
utilities:

```js
cosmicLib.signersUtils.extends(transaction)
console.log(transaction.signers)
console.log(transaction.signersList)
transaction.hasSigner('GB...DECX')
transaction.hasSigned('GB...DECX')
```

## Additional ressources

### Documentation

cosmic-lib packs more that showed in this brief presentation. Please take a
look at the manual:

 * [Complete documentation](https://cosmic.plus/cosmic-lib/doc/CosmicLink.html)
 * [Cosmic queries specification](https://cosmic.plus/cosmic-lib/doc/tutorial-10-specs-query.html)
 * [Cosmic queries cheatsheet](https://cosmic.plus/cosmic-lib/doc/tutorial-20-cheatsheet-query.html)
 * [Emitting CosmicLinks without this library](https://cosmic.plus/cosmic-lib/doc/tutorial-30-emitting.html)

### Support

* [Galactic Talk](https://galactictalk.org/d/1701-release-cosmic-lib-beta-2)
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
