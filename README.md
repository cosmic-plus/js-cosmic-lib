# Welcome to js-cosmic-lib!

## What is js-cosmic-lib?

`js-cosmic-lib` implements the **Cosmic Link** protocol in JavaScript. The Cosmic
Link protocol allow to encode a [Stellar](https://stellar.org) transaction as
a query:

> <https://cosmic.link/?payment&amount=100&destination=tips*cosmic.link>

It supports compound transactions:

> <https://cosmic.link/?transaction&operation=manageData&name=migrated&value=true&operation=setOptions&homeDomain=anywallet.org>

And XDR-as-queries:

> [https://cosmic.link/?xdr=AAAA...AA==&network=public](https://cosmic.link/?xdr=AAAAAL2ef/Z7FpGtgUvkKaEg3uvy9IH+T9chWSUhQILKTk/NAAAAZAEMX34AAAADAAAAAAAAAAAAAAABAAAAAAAAAAUAAAABAAAAAIQ/AS7GRUBBd96ykumKKUFE92+oiwRuJ7KXuvPwwTQWAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==&network=public)

While the **cosmic.link** website provides a convenient way to share
transactions over social medias, emails and static documents, any
wallet/service can issue or handle cosmic links queries by itself. One
advantage of cosmic links is to allow sharing transactions across the ecosystem
without having to rely on any particular service.

Cosmic links adoption will enable developpers to offer innovative services
without having to implement a built-in wallet; And everyboy to use thoses
services withouth having to compromise their private keys or create multiple
accounts. By opening connections between projects, we will start to build a
massive userbase at the ecosystem level rather than fragment it around a few
top-level applications.


## Get started

### Install

#### Node / Yarn

```sh
npm install --save cosmic-lib
```

In your script:

```js
const cosmicLib = require('cosmic-lib')
const CosmicLink = require('cosmic-lib').CosmicLink
```

Or:

```js
import cosmicLib from 'cosmic-lib'
import {CosmicLink} from 'cosmic-lib'
```


#### Bower

```js
bower install cosmic-lib
```

In your HTML pages:

```HTML
  <body>
  ...
    <!-- Best placed at the end of body to not delay page loading -->
    <!-- js-cosmic-lib depends on StellarSdk                      -->
    <script src="./bower_components/stellar-sdk/stellar-sdk.min.js"></script>
    <script src="./bower_components/cosmic-lib/cosmic-lib.js"></script>
    <script>var CosmicLink = cosmicLib.CosmicLink</script>
  </body>
```


#### HTML

```HTML
  <body>
  ...
    <!-- Best placed at the end of body to not delay page loading -->
    <!-- js-cosmic-lib depends on StellarSdk                      -->
    <script src="https://unpkg.com/stellar-sdk/dist/stellar-sdk.min.js"></script>
    <script src="https://unpkg.com/cosmic-lib/cosmic-lib.js"></script>
    <script>var CosmicLink = cosmicLib.CosmicLink</script>
  </body>
```

Note: For production release it is advised to serve your own copy of the libraries.


### Sign & Send

```js
var cosmicLink = new CosmicLink(url, { network: ..., user: ... })

cosmicLink.sign(...keypairs)
  .then(function () { return cosmicLink.send() })
  .then(console.log)
  .catch(console.error)
```

Note: `network` should be either 'public' or 'test'. `user` is the fallback
transaction source account. It is used in case `url` doesn't provides one. As
for any address in cosmic-lib, you can give either a federated address or the
account ID.


### Convert

#### From cosmic link to Stellar Transaction object

```js
var cosmicLink = new CosmicLink(url, { network: ..., user: ... })

cosmicLink.getTransaction()
  .then(function (transaction) { console.log(transaction) })
  .catch(console.error)
```


#### From cosmic link to XDR

```js
var cosmicLink = new CosmicLink(url, { network: ..., user: ... })

cosmicLink.getXdr()
  .then(function (xdr) { console.log(xdr) })
  .catch(console.error)
```


#### From XDR to URI

```js
var cosmicLink = new CosmicLink(xdr, { network: ..., user: ..., page: ... })

cosmicLink.getUri()
  .then(function (uri) { console.log(uri) })
  .catch(console.error)
```


### Global configuration

`cosmicLib.config` allow to define the default values used when creating
CosmicLink objects and using other cosmic-lib functions. This way, you won't
need to provide the data each time you create a CosmicLink.

```
cosmicLib.config.page = 'https://cosmic.link/'  // Base URI when generating links
cosmicLib.config.network = 'test'               // 'public' by default
cosmicLib.config.user = 'tips*cosmic.link'      // Undefined by default
```


### Display (HTML)

To automatically display a description of your *CosmicLink* in your HTML pages:

```HTML
    <!-- This would setup a space where your transactions will display automatically -->
    <div id="CL_htmlNode"></div>
```

To handle the HTML node from javascript:

```js
var cosmicLink = new CosmicLink(url, network, userAddress)
var body = document.querySelector('body')
document.appendChild(body, cosmicLink.htmlNode)
```


### Styling

The default style sheet is loaded with the library. If you want to tweak the CSS
you can find the template at:

> <https://raw.githubusercontent.com/MisterTicot/js-cosmic-lib/master/cosmic-lib.css>

Make sure you load it *after* the library.


## Emitting cosmic links without this library

As cosmic links syntax is straightforward, it may feel more convenient to write
a few routines to produce them without relying on any additional dependency.


### XDR links

```js
function makeXdrUri (page, network, xdr) {
  return page + '?xdr=' + xdr + '&network=' network
}

const uri = makeXdrUri ('https://cosmic.link/', 'test', 'AAA...A==')
```


### Single-operation links

```js
function makeOperationUri (page, operation, arguments) {
  var query = '?' + operation
  for (let field in arguments) query += '&' + field + '=' + arguments[field]
  return page + query
}

const uri = makeOperationUri('https://cosmic.link/', 'payment',
  { memo: 'donation', destination: 'tips*cosmic.link', amount: '100' }
)
```

Note: you may want to sanitize operation/arguments using `encodeURIComponent`.

### Multi-operation links

```js
function makeTransactionUrl (page, transactionFields, operations) {
  var query = '?transaction'
  for (let field in transactionFields) query += '&' + field + '=' + transactionFields[field]
  operations.forEach(function (entry) {
    query += '&operation=' + entry.type
    delete entry.type
    for (let field in entry) query += '&' + field + '=' + entry[field]
  })
  return page + query
}

const uri = makeTransactionUrl('https://cosmic.link/',
  { memo: 'text:Example', minTime: '2018-07' },
  [
    { type: 'setOptions', homeDomain: 'https://stellar.org' },
    { type: 'manageData', name: 'updated', value: 'yes' },
    { type: 'manageData', name: 'userID', value: '737' }
  ])
```

Note: you may want to sanitize fields/operation/arguments using
`encodeURIComponent`.


## Additional ressources

### Support

* [Galactic Talk](https://galactictalk.org/d/1519-release-js-cosmic-lib-beta-1-stellar-transactions-into-url-and-qr)
* [Telegram](https://t.me/cosmiclink)
* Stellar Slack: [@Mister.Ticot](https://slack.stellar.org/)


### Releases

This is a beta release, some compatibility-breaking changes are to be expected.
The minor version number will jump by ten when this will happen.

 * [GitHub repository](https://github.com/MisterTicot/js-cosmic-lib)
 * [NPM package](https://npmjs.com/cosmic-lib)
 * [Yarn package](https://yarn.pm/cosmic-lib)
 * [Task list](https://github.com/MisterTicot/js-cosmic-lib-src/blob/master/TODO.md)


### Documentation

 * [Complete documentation](https://misterticot.github.io/js-cosmic-lib/docs/CosmicLink.html)
 * [Cosmic queries specification](https://misterticot.github.io/js-cosmic-lib/docs/tutorial-specifications.html)
 * [Cosmic queries cheatsheet](https://misterticot.github.io/js-cosmic-lib/docs/tutorial-cheatsheet2.html)
 * [CosmicLink class cheatsheet](https://misterticot.github.io/js-cosmic-lib/docs/tutorial-cheatsheet.html)


### Related tools

 * [Demo page](https://misterticot.github.io/js-cosmic-lib/demo.html)
 * [Debug page](https://misterticot.github.io/js-cosmic-lib/debug.html)


### Related articles

* 26 Jul 2018: [Understanding Cosmic Links](https://medium.com/@mister.ticot/understanding-cosmic-links-ee2ace259671)
* 22 Jan 2018: [A standardized way of handling Stellar transactions](https://steemit.com/crypto/@mister.ticot/a-standardized-way-of-handling-stellar-transactions)


### Services that implement cosmic links

 * The Cosmic.Link website: <https://cosmic.link>
 * Stellar Authenticator: <https://stellar-authenticator.org>


## Contribute

`js-cosmic-lib` is a free software. You are very welcome to contribute by
whatever means you'd like. Donation are also possible at [tips*cosmic.link](https://cosmic.link/?payment&memo=Donation&destination=tips*cosmic.link&amount=100)


## Thank you :)

Especially to: Torkus, Dhzam, StellarGuard, Zac and Umbrel.
And to the Stellar Foundation for supporting my work.
