# cosmic-lib

![Licence](https://img.shields.io/github/license/cosmic-plus/js-cosmic-lib.svg)
[![Dependencies](https://badgen.net/david/dep/cosmic-plus/js-cosmic-lib)](https://david-dm.org/cosmic-plus/js-cosmic-lib)
![Vulnerabilities](https://snyk.io/test/npm/cosmic-lib/badge.svg)
![Size](https://badgen.net/bundlephobia/minzip/cosmic-lib)
![Downloads](https://badgen.net/npm/dt/cosmic-lib)

cosmic-lib is a JavaScript implementation of the **CosmicLink protocol** that
comes with a few useful additional tools.

## What are CosmicLinks?

CosmicLinks are normal URL or URI that contains a Stellar transaction encoded
in their query. It allows to pass Stellar transaction to **any webpage** or
**any software**. Here's an example on the https://cosmic.link website:

> <https://cosmic.link/?payment&amount=100&destination=tips*cosmic.link>

CosmicLinks use a simple syntax that allow to write any arbitrary transaction:

> <https://cosmic.link/?transaction&operation=manageData&name=migrated&value=true&operation=setOptions&homeDomain=anywallet.org>

It can be used to pass transaction XDR as well:

> [https://cosmic.link/?xdr=AAAA...AA==&network=public](https://cosmic.link/?xdr=AAAAAL2ef/Z7FpGtgUvkKaEg3uvy9IH+T9chWSUhQILKTk/NAAAAZAEMX34AAAADAAAAAAAAAAAAAAABAAAAAAAAAAUAAAABAAAAAIQ/AS7GRUBBd96ykumKKUFE92+oiwRuJ7KXuvPwwTQWAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==&network=public)

While the **https://cosmic.link** website provides a convenient way to share
transactions over social medias, emails and static documents, any
wallet/service can issue or accept CosmicLinks. One big advantage of using
queries is that they can be used to pass transactions without having to rely
on any particular service.

This is a generalization of tools like Metamask for Ethereum, as it allows any
service to communicate with any (compatible) wallet; And users to sign
transactions from any service without ever divulging private keys.

The ultimate goal of the CosmicLink protocol is to enable **wallet-less
applications** for Stellar.

## Installation

### Node / Yarn

- **NPM**: `npm install --save cosmic-lib`
- **Yarn**: `yarn add cosmic-lib`

In your script:

```js
const cosmicLib = require("cosmic-lib")
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
  <script src="https://cdn.cosmic.plus/stellar-sdk"></script>
  <script src="https://cdn.cosmic.plus/cosmic-lib@1.x"></script>
```

**Note**: For production release it is advised to serve your own copy of the
libraries.

## Basic Usage

### Create CosmicLinks

#### New Transaction

The transaction builder is similar to the one provided by StellarSdk.
Additionally, it accepts federated addresses and offer syntactic sugar for
memos, dates and assets.

```js
const cosmicLink = new CosmicLink({ network: 'test', memo: 'Demo', maxTime: '2019-01' })
  .addOperation('payment', { destination: 'tips*cosmic.link', amount: 10 }) // XLM is implied
  .addOperation('changeTrust', { asset: 'CNY:admin*ripplefox.com' }) // Max limit is implied
  .addOperation(...)
```

#### From an Existing Transaction

- From a StellarSdk Transaction: `new CosmicLink(transaction, { network: "public" | "test" | passphrase })`
- From an XDR: `new CosmicLink(xdr, { network: "public" | "test" | passphrase })`
- From a CosmicLink URI/query: `new CosmicLink(uri|query)`
- From a SEP-0007 link: `new CosmicLink(sep7)`

### Edit a CosmicLink

- Change transaction fields: `cosmicLink.setTxFields(parameters)`
- Add operation: `cosmicLink.addOperation(name, parameters)`
- Set operation: `cosmicLink.setOperation(index, name, parameters)`
- Remove operation: `cosmicLink.setOperation(index, null)`

**Example:**

```js
cosmicLink
  .setTxFields({ memo: "newMemo", source: null, sequence: null })
  .addOperation("manageData", { name: "foo", value: "bar" })
  .setOperation(1, "mergeAccount", { destination: "in*tempo.eu.com" })
  .setOperation(0, null)
```

### Get the Link

- Get the HTML link element: `cosmicLink.htmlLink`
- Get the URI: `cosmicLink.uri`
- Get the query: `cosmicLink.query`

If your webpage contains an HTML link element with `id="cosmiclink"`, it will
automatically get updated with the latest CosmicLink URI.

### Display the Transaction

You'll probably want to load the StyleSheet for cosmic-lib first:

```js
await cosmicLib.load.styles()
```

Then, you can get the HTML description element at: `cosmicLink.htmlDescription`.

If your webpage contains an HTML element with `id="cosmiclink_description"`,
it will automatically get updated with the latest CosmicLink description.

### Formats conversion

```js
console.log(cosmicLink.json)
console.log(cosmicLink.tdesc) // The most convenient format to manipulate transactions

// Lock CosmicLink to a network & a source account to compute its Transaction & XDR.
await cosmicLink.lock()
console.log(cosmicLink.transaction)
console.log(cosmicLink.xdr)
console.log(cosmicLink.sep7)
```

**Note**: If you parsed CosmicLink from an XDR/Transaction/SEP-0007 link you
don't need to use `cosmicLink.lock()` for conversion purpose.

### Sign & Send the Transaction

```js
// Lock CosmicLink to a network & a source account to fetch signers data.
await cosmicLink.lock()
cosmicLink.sign(...(keypair | preimage))
await cosmicLink.send()
```

**Note**: the transaction will automatically be transmitted to
[StellarGuard](https://stellarguard.me) when relevant.

### Global Configuration

```js
/**
 * Fallback network for network-less transaction requests.
 * @default "public"
 */
cosmicLib.config.network = "test"

/**
 * Fallback account for source-less transaction requests.
 * @default undefined
 */
cosmicLib.config.source = "tips*cosmic.link" // Undefined by default

/**
 * Base URL to use when building CosmicLinks.
 * @default "https://cosmic.link/"
 */
cosmicLib.config.page = "https://cosmic.link/"
```

### Advanced configuration

Setting the Horizon node for a given network:

```js
cosmicLib.config.setupNetwork("test", "https://horizon.example.org")
```

Adding a custom network:

```js
cosmicLib.config.setupNetwork(
  "myCustomNetwork",
  "https://horizon.example.org",
  "MyCustomPassphrase"
)
```

## Other Utilities

cosmic-lib exposes part of its underlying code as additional modules.

### Resolve

- Get the Server object for a network `cosmicLib.resolve.server("public" | "test" | passphrase)`
- Resolve a federated address: `await cosmicLib.resolve.address("tips*cosmic.link")`
- Resolve an account: `await cosmicLib.resolve.account("tips*cosmic.link")`
- Resolve transaction signers list: `await cosmicLib.resolve.txSignersList(transaction)`

### Signers Utils

Extends a StellarSdk Transaction object with convenient multi-signature
utilities:

```js
cosmicLib.signersUtils.extends(transaction)
console.log(transaction.signers)
console.log(transaction.signersList)
transaction.hasSigner("GB...DECX")
transaction.hasSigned("GB...DECX")
```

## Release

This is the beta-2 release. The codebase is mature and few to no compatibility
breaks are expected.

- [GitHub repository](https://github.com/cosmic-plus/js-cosmic-lib)
- [NPM package](https://npmjs.com/cosmic-lib)
- [Yarn package](https://yarn.pm/cosmic-lib)
- [Changelog](https://github.com/cosmic-plus/js-cosmic-lib/blob/master/CHANGELOG.md)
- [Tasklist](https://github.com/cosmic-plus/js-cosmic-lib/blob/master/TODO.md)

## Additional ressources

### Documentation

cosmic-lib packs more that showed in this brief presentation. Please take a
look at the manual:

- [Complete documentation](https://cosmic.plus/js-cosmic-lib/web/doc/CosmicLink.html)
- [Cosmic queries specification](https://cosmic.plus/js-cosmic-lib/web/doc/tutorial-10-specs-query.html)
- [Cosmic queries cheatsheet](https://cosmic.plus/js-cosmic-lib/web/doc/tutorial-20-cheatsheet-query.html)
- [Emitting CosmicLinks without this library](https://cosmic.plus/js-cosmic-lib/web/doc/tutorial-30-emitting.html)

### Support

- [Keybase](https://keybase.io/team/cosmic_plus)
- [Telegram](https://t.me/cosmic_plus)
- [Reddit](https://reddit.com/r/cosmic_plus)
- [Website](https://cosmic.plus)
- [Mail](mailto:mister.ticot@cosmic.plus)

### Related tools

- [Demo page](https://cosmic.plus/js-cosmic-lib/web/demo.html)
- [Debug page](https://cosmic.plus/js-cosmic-lib/web/debug.html)

### Related articles

- 23 Jan 2018: [One Year Later: Walletless Stellar Applications Are Finally
  Coming](https://medium.com/cosmic-plus/one-year-later-walletless-stellar-applications-are-finally-coming-238a8aa368b2)
- 26 Jul 2018: [Understanding Cosmic
  Links](https://medium.com/cosmic-plus/understanding-cosmic-links-ee2ace259671)
- 22 Jan 2018: [A standardized way of handling Stellar
  transactions](https://medium.com/cosmic-plus/a-standardize-way-of-handling-stellar-transactions-4dd35382eda1)

### Services that uses CosmicLinks

- Equilibre.io portfolio balancer: <https://equilibre.io>
- The Cosmic.Link website: <https://cosmic.link>
- Stellar Authenticator: <https://stellar-authenticator.org>

## Contribute

cosmic-lib is a free software. You are very welcome to contribute by whatever
means you'd like. Donation are also possible at
[tips\*cosmic.link](https://cosmic.link/?payment&memo=Donation&destination=tips*cosmic.link&amount=20)

## Thank you :)
