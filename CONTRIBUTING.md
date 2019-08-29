# Contributing Guidelines

Welcome to new contributors! This project is open to input & edits.

## Bug Reports & Feature Requests

Please use the [dedicated form](https://github.com/cosmic-plus/js-cosmic-lib/issues/new/choose).

## Pull Requests

1. Fork [js-cosmic-lib](https://github.com/cosmic-plus/js-cosmic-lib).
2. Commit your changes to the fork.
3. Create a pull request.

If you want to implement a new feature, please get in touch first:
[Keybase](https://keybase.io/team/cosmic_plus),
[Telegram](https://t.me/cosmic_plus), [Email](mailto:mister.ticot@cosmic.plus).

## Project Structure

- `bundled/`: Static files which get bundled into the web module.
- `es5/`: JS transpiled code (generated at build time, not commited).
- `howto/`: Additional guides.
- `src/`: JS source code.
- `static/`: Static files, added to `web/` at build time.
- `style/`: SCSS styles.
- `test/`: Test suite.
- `web/`: JS bundled code (generated at build time, commited in a submodule).

## Workflow

**Clone:**

```
git clone https://git.cosmic.plus/js-cosmic-lib
cd js-cosmic-lib
npm run get
```

**Commit:**

```
npm run lint
git ci ...
```

Please sign your commits with your PGP key.

**Release:**

First of all update the package version into `package.json`.

```
export version={semver}
npm run make-release
npm run publish-release
```

Please sign your commits and tags with your PGP key.

## Scripts

Those helpers require a POSIX shell.

- `npm run get`: Fetch the `web` sub-repository.
- `npm run lint`: Lint code.
- `npm run clean`: Clean the `web/` directory.
- `npm run watch`: Automatically transpile & bundle code after each change.
- `npm run serve`: Run a live server that updates after each change.
- `npm run build`: Build the production transpiled code & browser bundle.
- `npm run check`: Check the production browser bundle integrity.
- `version={semver} npm run make-release`: Build & locally commit release.
- `version={semver} npm run publish-release`: Check, tag, push & publish release.
