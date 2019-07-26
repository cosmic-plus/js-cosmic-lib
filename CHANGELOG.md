# Changelog

All notable changes to this project will be documented in this file.

## 1.5.5 - 2019-07-26

### Changed

- Automate release procedure.
- Add contributing guidelines.

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
[@tyvdh]: https://github.com/tyvdh
