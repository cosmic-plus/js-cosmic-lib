# Changelog

All notable changes to this project will be documented in this file.

## Unreleased

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
history](https://github.com/cosmic-plus/node-cosmic-lib/commits/master).

[stellar-sdk]: https://github.com/stellar/js-stellar-sdk/blob/master/CHANGELOG.md
