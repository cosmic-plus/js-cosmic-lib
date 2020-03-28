**cosmic-lib /**
[Documentation](https://cosmic.plus/#view:js-cosmic-lib/web/doc)
• [Examples](https://cosmic.plus/#view:js-cosmic-lib/EXAMPLES)
• [Contributing](https://cosmic.plus/#view:js-cosmic-lib/CONTRIBUTING)
• [Changelog](https://cosmic.plus/#view:js-cosmic-lib/CHANGELOG)

# Changelog

All notable changes to this project will be documented in this file.

This project adheres to **[Semantic
Versioning](https://semver.org/spec/v2.0.0.html)**. Version syntax is
`{major}.{minor}.{patch}`, where a field bump means:

- **Patch**: The release contains bug fixes.
- **Minor**: The release contains backward-compatible changes.
- **Major**: The release contains compatibility-breaking changes.

**Remember:** Both micro and minor releases are guaranteed to respect
backward-compatibility and can be updated to without risk of breakage. For major
releases, please check this changelog before upgrading.

## 2.7.0 - 2020-03-28

### Changed

- Logic: Update [stellar-sdk] to 4.1.0. (support for SEP29 have been added, [see
  changelog](https://github.com/stellar/js-stellar-sdk/blob/master/CHANGELOG.md#v410))

## 2.6.0 - 2020-03-07

### Changed

- Meta: Upgrade [stellar-sdk] to 4.x.

## 2.5.0 - 2019-11-27

### Changed

- Protocol: Re-introduce source-less SEP7 requests. It's not part of the specs
  anymore, but some Wallets such as StellarTerm or Lobstr use it anyway.

## 2.4.1 - 2019-11-23

### Fixed

- UI: Give SideFrame a minWidth. This is intended to improve big screens
  support.
- UI: Fix the shadow overlay positioning. In some cases, it was not covering
  fully the window.
- UI: Have SideFrame `Close` button always ontop. It was not showing up on
  website where SideFrame z-index was set to be higher than 1000.

## 2.4.0 - 2019-11-15

### Changed

- Style: Upgrade graphic design.

### Fixed

- UI: Make SideFrame animation smoother.
- UI: Fix SideFrame height. The last 2em were overflowing the window.

## 2.3.0 - 2019-11-11

### Added

- Meta: Add `side-frame.js` web bundle. It is now possible to load the SideFrame
  component independently from
  <https://cdn.cosmic.plus/cosmic-lib/side-frame.js>. The component is then
  available as `SideFrame`.

### Changed

- UI: Make SideFrame "close" button bigger.

## 2.2.1 - 2019-11-09

### Fixed

- API: Fix decoding of messages with an '=' sign.

## 2.2.0 - 2019-10-26

### Added

- API: Add operation `pathPaymentStrictSend`.
  [Example](https://cosmic.plus/js-cosmic-lib/web/demo?type=pathPaymentStrictSend&destination=tips*cosmic.link&destAsset=GILS:gils*cosmic.plus&destMin=100&sendAsset=XLM&sendAmount=20&network=test)
  (part of [protocol 12
  update](https://www.stellar.org/developers/blog/horizon-v0-22-0-released-protocol-12-support/#about-protocol-12))

### Changed

- API: Rename pathPayment in pathPaymentStrictReceive. (part of [protocol 12
  update](https://www.stellar.org/developers/blog/horizon-v0-22-0-released-protocol-12-support/#about-protocol-12))
- Logic: Update [stellar-sdk] to 3.1.2. (protocol 12 support)

## 2.1.1 - 2019-09-28

### Added

- Documentation: Add examples.
- Documentation: Add `cosmicLink.signSep7()` documentation.

### Fixed

- API: `cosmicLink.signSep7()` is synchronous. The `async` attribute was kept
  by mistake in the previous release.

## 2.1.0 - 2019-09-14

### Added

- API: Add `sep7Utils.registerWebHandler()`. This is a helper to register a
  page as a SEP-0007 web handler. [See
  documentation](https://cosmic.plus/#view:js-cosmic-lib/web/doc/module-sep7Utils.html#.registerWebHandler).
- API: Add `sep7Utils.isWebHandlerSupported()`. This helpers returns whether
  or not web protocol handlers are supported by the current browser. [See
  documentation](https://cosmic.plus/#view:js-cosmic-lib/web/doc/module-sep7Utils.html#.isWebHandlerSupported).
- Documentation: Add [EXAMPLES.md](https://cosmic.plus/#view:js-cosmic-lib/EXAMPLES).

### Changed

- API: Change SEP-0007 handler default parameter. Replace the generic `?req=`
  by the more specific `?sep7=`; Handlers should then register as
  `{handler}?sep7=%s` where %s will be replaced by the encoded SEP-0007 link.
  _Note: `?req=` is still accepted for backward-compatibility purpose._
- API: Read `network` from Transaction. As StellarSdk _Transaction_ now embeds
  a network passphrase, it gets parsed when calling `new CosmicLink(transaction)`.
- Demo: Set as SEP-0007 handler on compatible browsers only.

### Fixed

- Meta: Set bower package to use stellar-sdk 3.x.

## 2.0.0 - 2019-09-07

### Breaking

- Protocol: SEP-0007 `tx` now requires a source account. A recent change in
  the SEP-0007 protocol removed `tx` operation support for source-independent
  transaction requests. As a consequence, SEP-0007 links using the source
  account `GAAA...AWHF` don't get stripped of their source by default anymore,
  and trying to build SEP-0007 links without specifying a source will fail.
- Protocol: Keep neutral account & sequence. When SEP-0007 `tx` support was
  initially implemented, it required the neutral account (`GAAA...AWHF`) and
  sequence to get stripped off & replaced by user account values. This feature
  "leaked" into CosmicLink `xdr` queries parsing as a free addition. However,
  this feature has never been included in the specs and is now getting removed.
  _- Note: SEP-0007 `tx` neutral sequence still get stripped as required by its
  own specifications._

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
- API: Add options to strip neutral account & sequence. To compensate with the
  protocol changes introduced in this release, two XDR/SEP-0007 options have
  been introduced: `stripNeutralAccount` and `stripNeutralSequence`. cosmic-lib
  1.x behavior can be implemented this way: `new CosmicLink(xdr, { stripNeutralAccount: true, stripNeutralSequence: true})`.
- UI: Add SEP-0007 origin_domain in HTML description.

### Changed

- Demo: Display SEP-0007 source account error.
- Logic: Update status on SEP-0007 verification failure. You still need to
  `await cosmicLink.verifySep7()` before signing a transaction request, as
  signature verification is asynchronous.
- Logic: Allow to set SEP-0007 `pubkey` & `msg`. Those can be defined with
  `cosmicLink.extra.pubkey` and `cosmicLink.extra.msg` before reading
  `cosmicLink.sep7`.

### Fixed

- API: Fix a regression in the parser. 1.8.1 did not properly handle empty
  transactions (`?`).
- API: Add `&strip=source` to sourceless XDR query. Sourceless XDR query are
  computed when calling `cosmicLink.lock()` without having a source defined.
- UI: Fix buying/selling description. Use "at {price}" rather than "for
  {price}".

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
