# To Reviewers

Here are some clues about how this library works.

## Library configuration

All functions exported in the present modules take a **conf** parameter as the
first argument. This is an internal parameter that is never exposed to the
user of this library. The library use it to pass the global configuration
(**config.js**), a CosmicLink which embed its own local configuration or a
custom configuration object.

This allows for per-object configuration parameters such as network, horizon
node, fallback source account, per-object error handling and per-object cache.

The following modules are playing a role in the context of library
configuration:

* **index.js** provides a way to make a clone of the library with an
  alternative configuration object (**withConfig**)
* **aliases.js** provides a way to uses aliases instead of public keys when
  displaying a transaction.
* **event.js** provides clickHandlers which are globally configurable.

## Other Base Modules

Along with the ones pertaining to global configuration, those modules provide
the base upon which this library is built:

* **resolve.js** implements routines to select network/horizon nodes and
  retrieve data from the blockchain and federated servers.
* **status.js** provides a way to store and display errors.

## Conversions

### Core formats

Translating Stellar transactions between various formats is at the core of
this library. The main conversion path is between StellarSdk Transaction
objects and cosmic queries:

```
Query  <--->  Tdesc  <--->  Transaction
```

**Tdesc** is an intermediate format. It is both a simplified transaction
object, and an objectified query. While it is not required to be standardized
across languages, it has the property of converting from/to JSON without loss
of information. This is a valuable property as JSON is massively used on the
web to pass data.

### Additional formats

From those three centric formats a few other can be derived:

```
Query  <--->  Tdesc  <--->  Transaction
  ^             ^                ^
  |             |                |
  v             v                v
 URI           JSON             XDR
                                 ^
                                 |
                                 v
                             SEP-0007
```

**Notes:**

* SEP-0007 is partially supported (only `tx` operation which embed an XDR)
* There's a conversion path between Query and XDR formats with the `?xdr=`
  command.

### Modules

The **convert.js** module exposes most of the conversion paths between
formats. The parsing of `?xdr=` sep7/queries is handled separately inside
**parse.js**.

While conversion to secondary formats is rather straightforward, each of the 4
conversions paths between the primary formats is implemented in its own module:

```
     decode.js    construct.js
    ---------->   ---------->
Query         Tdesc         Transaction
    <----------   <----------
     encode.js     destruct.js
```

### Other libraries related to tdesc format

* **check.js** exports the routines to check for tdesc correctness.
* **normalize.js** exports the routines to add default values, remove useless
  ones and format some values to a more compact form.
* **expand.js** convert query/StellarSdk formated values to well-formated
  tdesc values when creating CosmicLinks from tdesc/JSON. This allows library
  users to use the compact query syntax ('XRP:admin\*ripplefox.com') in tdesc
  inputs.
* **format.js** exports the routines to convert a tdesc in its HTML
  description.

## CosmicLink

CosmicLink is the class that embed most of the library functionalities. It
makes use of the following modules on top of formats ones:

* **action.js** implements lock()/sign()/send().
* **cosmiclink.js** ties everything together in the CosmicLink class.
* **parse.js** handle the user/dev transaction input from which CosmicLink are
  created. It guesses input type and convert it to tdesc to create the
  CosmicLink object.
* **signers-utils.js** handles everything related to multi-signature.

## Caching

Responses from federation servers and horizon node are cached along with each
CosmicLink object. Cached data are not shared between objects. This is
generally a good strategy, as it optimizes the bandwidth and ensure
CosmicLink consistency without making new objects out-of-sync.

You can enable global caching if you need. In this case, it's up to you to
manage the cache, as no cleaning strategy is natively implemented. The
following line will enable caching at the library-level:

```
cosmicLib.config.cache = { destination: {}, account: {} }
```
