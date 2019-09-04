**cosmic-lib /**
[Documentation](https://cosmic.plus/#view:js-cosmic-lib/web/doc)
• [Contributing](https://cosmic.plus/#view:js-cosmic-lib/CONTRIBUTING)
• [Changelog](https://cosmic.plus/#view:js-cosmic-lib/CHANGELOG)

# Changelog

All notable changes to this project will be documented in this file.

## Unreleased

### Removed

- API: Remove deprecated _CosmicLink_ properties. Those properties were
  deprecated since a year: `server`, `htmlNode`, `transactionNode`,
  `statusNode`, `signersNode`, `hasSigned`, `hasSigner`.

### Added

- API: Add `cosmicLink.verifySep7()`. Verify SEP-0007 signature by resolving
  `cosmicLink.extra.domain`, if any. Throw an error if the signature is not
  valid.
- API: Add `cosmicLink.signSep7()`. Parameters: domain, keypair. Sign SEP-0007
  link for **domain**, using **keypair**.

### Fixed

- API: Fix a regression in the parser. 1.8.1 did not properly handle empty
  transactions (`?`).

## 1.8.1 - 2019-09-02

### Fixed

- Api: Fix a regression in the parser. 1.8.0 broke backward-compatibility for
  queries made by one operation only, such as `?inflation` and `?setOptions`.

## 1.8.0 - 2019-08-31

### Deprecated

- Api: Deprecate functions related to the global Network class. StellarSdk now
  uses a scoped network parameter, hence the functions
  `cosmicLink.selectNetwork()` and `resolve.useNetwork()`, which are helpers to
  switch the StellarSdk global Network, are now deprecated. Those functions will
  get removed in sync with StellarSdk removal of its global Network class.

### Added

- Documentation: Add navigation header.

### Changed

- Meta: Upgrade [stellar-sdk] to 3.x.
- Api: Implement XDR-links param `strip`. It replaces parameters `stripSource`,
  `stripSequence` & `stripSignatures` by the standard-compliant
  `strip="source"|"sequence"|"signatures"`.
- Api: Add a `type=` prefix to param queries. The previous syntax was not
  standard-compliant. Example:
  `?type=payment&destination=tips*cosmic.link&amount=20`
- Documentation: Differenciate between meta & transaction fields.
- Documentation: Update CONTRIBUTING.md.

## 1.7.2 - 2019-08-27

### Fixed

- Meta: Fix a regression that prevented to bundle cosmic-lib. It was introduced
  in 1.7.0.

## 1.7.1 - 2019-08-24

### Fixed

- Api: Fix SEP-0007 `pay` memo & asset error checks.
- Demo: Fix source-code link.

## 1.7.0 - 2019-08-17

### Added

- Api: Add action `cosmicLink.open(target)`. Valid targets are:
  - `frame` (default): Open cosmicLink in a side-frame.
  - `tab`: Open cosmicLink in a new tab.
  - `current`: Open cosmicLink into the current window.
  - `sep7`: Open cosmicLink using user's SEP-0007 handler.
- Api: Add SEP-0007 signature check.
  - `cosmicLink.extra.originDomain` is a _Promise_ that resolves to the
    origin_domain parameter when the link signature is valid. It rejects an
    error when the signature check fails. This property is `undefined` when the
    link has no origin_domain.
  - `cosmicLink.extra.signature` contains the link signature, if any.
- Demo: Add a link to register as a SEP-0007 handler.

### Fixed

- Api: Fix SEP-0007 `callback` parameter encoding. (thanks [@pselden] &
  [@nikhilsaraf])
- Demo: Fix the 'computing...' message in format boxes.

## 1.6.0 - 2019-08-10

### Added

- Implement support for SEP-0007 `pay` operation.
- Add the `cosmicLink.extra` property for SEP-0007 specific information:
  - `cosmicLink.extra.type` indicates the operation encoded into the
    SEP-0007 link (either `tx` or `pay`).
  - `cosmicLink.extra.pubkey` contains the tx operation `pubkey`, if any.
  - `cosmicLink.extra.msg` contains the parsed `msg`, if any. This is provided
    for compatibility purpose only. Displaying messages from untrusted sources
    into trusted interfaces opens hard to mitigate attack vectors & is
    discouraged.
- Add new method `cosmicLink.insertOperation(index, type, params)`.

### Fixed

- Set `cosmicLink.sep7` to input URL when parsing CosmicLink from SEP-0007 link.

## 1.5.5 - 2019-07-26

### Changed

- Automate release procedure.
- Add contributing guidelines.
- Update [stellar-sdk] to 2.1.1 (bugfixes).

## 1.5.4 - 2019-07-23

### Fixed

- Workaround a regression in [stellar-sdk] 2.0.1 that causes CallBuilder to
  fetch the wrong URL when several of them are created from the same Server
  instance. ([#379](https://github.com/stellar/js-stellar-sdk/issues/379)).

## 1.5.3 - 2019-07-20

### Changed

- Improve discoverability (add badges, keywords, set homepage...).

## 1.5.2 - 2019-07-19

### Changed

- Update [stellar-sdk] to 2.0.1.
- Switch to new cosmic.plus paths (cdn.cosmic.plus, new repository name).

## 1.5.1 - 2019-06-18

### Changed

- Update [stellar-sdk] to 1.0.3. (Get rid of a vulnerability in axios)

### Fixed

- Ignore SEP-0007 `msg` field as intended, instead of raising an error. This
  field is not supported by cosmic-lib because we don't want to display a
  message from untrusted sources into trusted interfaces, and because URL length
  is limited. Transaction request emitter should make sure the purpose of the
  transaction is clear before issuing a transaction request. - Thanks [@tyvdh]
- Decode the '+' character as a space for string parameters (text memo, network
  passphrase, text data in 'manageData' operation). - Thanks [@tyvdh]

## 1.5.0 - 2019-06-08

### Added

- Support for the new operation `manageBuyOffer`.
- New operations `manageSellOffer` & `createPassiveSellOffer` replace
  `manageOffer` & `createPassiveOffer` in protocol 11 update. For backward
  compatibility, the old operations are still accepted.

### Changed

- Update [stellar-sdk] to 1.0.2.

### Fixed

- Fix a rare bug related to offer deletion.

## 1.4.1 - 2019-05-17

### Fixed

- Fix gateway timeout handling (error 504).

## 1.4.0 - 2019-04-26

### Added

- Bundle transpiled ES5 code within the package.

## 1.3.0 - 2019-04-19

### Added

- Syntactic sugar to define minTime/maxTime relatively to the current time, in
  minutes. This gets immediately computed into the corresponding UTC date.
  - In queries: `&maxTime=+10`
  - In objects: `{ maxTime: "+10" }`.

### Changed

- Update documentation.

## 1.2.10 - 2019-04-12

### Changed

- Update [stellar-sdk] to 0.15.0.
- When sending transactions, keep connection alive over gateway timeouts (error
  504).
- Errors returned by Horizon are now logged in the console.

## 1.2.9 - 2019-02-28

### Changed

- Update [stellar-sdk] to 0.14.0.

## 1.2.8 - 2019-02-14

### Changed

- New loader animation.
- Improve display of operations that edit an offer (manageOffer).

## 1.2.7 - 2019-02-06

### Added

- Add a syntactic sugar for offer deletion:
  `?manageOffer&offerId={id}&amount=0`.

### Changed

- Update [stellar-sdk] to 0.13.0.

## 1.2.6 - 2019-02-01

### Added

- It is now possible to setup onclick event handlers for any transaction field
  type, not only address, assets, memo & hashes.

### Changed

- Update [stellar-sdk] to 0.12.0.
- Improve memo display.
- Improve assets display.
- Improve longs amounts/prices display.

## Older Releases

There is no changelog for older releases. Please take a look at the [commit
history](https://github.com/cosmic-plus/js-cosmic-lib/commits/master).

[stellar-sdk]: https://github.com/stellar/js-stellar-sdk/blob/master/CHANGELOG.md
[@nikhilsaraf]: https://github.com/nikhilsaraf
[@pselden]: https://github.com/pselden
[@tyvdh]: https://github.com/tyvdh
