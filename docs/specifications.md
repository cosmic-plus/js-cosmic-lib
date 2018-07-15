# Cosmic links specifications

Cosmic links syntax mimic `js-stellar-sdk`
[Transactions](https://stellar.github.io/js-stellar-sdk/Transaction.html)
and [Operations](https://stellar.github.io/js-stellar-sdk/Operation.html)
methods.

## General syntax

### One-operation link

> ...?{operation}&{field}={value}&{...more_fields}

Where `{field}` can be either a transaction field or a valid field for
`{operation}`.

Example:

> <https://cosmic.link/?payment&memo=Donation&destination=tips*cosmic.link&amount=100>

### Multi-operation link

> ...?transaction&{...transactionFields}&operation={operation}&{...operationFields}&{...more_operations}

Because both the transaction and each operation can have a `source`
field, transactions fields have to be provided prior to any operation, then the
operations should be described sequentially.

Example:

> <https://cosmic.link/?transaction&memo=Example&operation=setOptions&homeDomain=example.org&operation=manageData&name=Wallet&value=example-wallet>

### XDR link

> ...?xdr={xdr}&{...options}

4 options are possible:

* `&network=[public|test]`: This one is always recommended as *js-cosmic-lib*
  won't automatically detect the valid network for {xdr}, and the default
  network may vary from one service to another.
* `&stripSignatures`: Remove the signatures when parsing the transaction.
* `&stripSequence`: Remove sequence number when parsing the transaction. Meaning it
  can be signed anytime in the future, possibly several times. Imply
  `&stripSignatures`.
* `&stripSource`: Remove the source account when parsing the transaction. Meaning
    it can be signed by anybody, possibly several times. Imply `&stripSequence`
    and `&stripSignatures`.

Example:

> [https://cosmic.link/?xdr=AAAA...AA==&network=public&stripSource](https://cosmic.link/?xdr=AAAAAL2ef/Z7FpGtgUvkKaEg3uvy9IH+T9chWSUhQILKTk/NAAAAZAEMX34AAAADAAAAAAAAAAAAAAABAAAAAAAAAAUAAAABAAAAAIQ/AS7GRUBBd96ykumKKUFE92+oiwRuJ7KXuvPwwTQWAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==&network=public&stripSource)

## Fields

### Transaction fields

Those fields may be used in any transaction and are all of them are optionals.
For multi-operations links, `source` will become the default source for any
operation that doesn't define one. In cosmic links, having a `source` is
optional as the source can be set by the wallet service when signing.

#### network

> &network={public|test}

Tie the transaction to a specific network.

#### memo

The general syntax for memos is:

> &memo={memoType}:{memoValue}

Where `{memoType}` is one of: `text`, `id`, `hash`, `return`. A short syntax
for text memo exist aswell:

> &memo={memoValue}

#### source

> &source={address}

Where `{address}` is either a federated address or an account ID, as any address
in `js-cosmic-lib`.

#### minTime / maxTime

> &minTime={YYYY-MM-DD}
> &maxTime={YYYY-MM-DDTHH:mm:ssZ}

This is the ISO 8601 date format.

#### sequence

> &sequence={integer}

The sequence number for this transaction.

#### fee

> &fee={integer}

Fees for this transaction. Should at least egual the minimum network fee.


### Operation fields

#### accountMerge

Destroy `source` account and send its lumens to `destination`.

Mandatory fields:
> ...?accountMerge&destination={address}

Optional fields:

* &source={address}



#### allowTrust

Allow `trustor` to hold your asset `assetCode`.

Mandatory fields:

> ...?allowTrust&assetCode={string}&trustor={address}

Optional fields:

* &authorize=false Revoke `trustor` permission to hold `assetCode`
* &source={address}


#### changeTrust

Accept `asset`.

> ...?changeTrust&asset={assetCode:issuerAddress}

Optional fields:

* &limit={integer} Maximum holding, if set to zero `source` will not accept
  `asset` anymore.
* &source={address}


#### createAccount

Create account `destination` and send it `initialBalance` lumens.

> ...?createAccount&destination={address}&initialBalance={amount}

Optional fields:

* &source={address}


#### createPassiveOffer

Sell `amount` `selling` under `price` `buying`.

> ...?selling={assetCode:issuerAddress}&buying={assetCode:issuerAddress}&amount={amount}&price={price}

Notes:

* `selling` or `buying` field may be omitted when it is lumens.
* `price` can also be a fraction like: 1:2, 1:100, or buyingAmount:sellingAmount

Optional fields:

* &source={address}


#### inflation

Run inflation

> ...?inflation

Optional fields:

* &source={address}


#### manageData

Clear data entry `name` / Set `name` value as `value`.

> ...?manageData&name={string}

Optional fields

* &value={string} If omitted, clear `name`, else set `name` to `value`.
* &source={address}


#### manageOffer

Sell `amount` `selling` at `price` `buying`.

> ...?selling={assetCode:issuerAddress}&buying={assetCode:issuerAddress}&amount={amount}&price={price}

Notes:

* `selling` or `buying` field may be omitted when it is lumens.
* `price` can also be a fraction like: 1:2, 1:100, or buyingAmount:sellingAmount

Optional fields:

* &offerId={integer} Allow to edit an existing offer. Will delete it if
`amount` is set to 0.
* &source={address}


#### pathPayment

Send `destAmount` `destAsset` to `destination` for `sendMax` `sendAsset` using
the available offers for the conversion.

> ...?pathPayment&destination={address}&destAmount={amount}&destAsset={assetCode:assetIssuer}
    &sendMax={amount}&sendAsset={assetCode:assetIssuer}

Notes:

* `destAsset` or `sendAsset` field may be omitted when it is lumens.

Optional fields:

* &path={asset1,asset2,...,assetN} Where each asset is `assetCode:assetIssuer`
  or `XLM`. Define a conversion path to follow. If neither `destAsset` or
  `sendAsset` are lumens, you'll likely need `&path=XLM` to set lumens as an
  intermediate conversion step.
* &source={address}


#### payment

Send `amount` `asset` to `destination`.

> ...?payment&amount={amount}&destination={address}

Optional fields:

* &asset={assetCode:assetIssuer} Define `asset` when it is not lumens.
* &source={address}


#### setOptions

Allow various actions depending on the optional fields you use. Without any
field this is a void operation.

> ...?setOptions

Optional fields:

* &inflationDest={address} Set `{address}` as the inflation destination for
  `source`.
* &clearFlags={integer} Bitmap integer for which account flags to clear
* &setFlags={integer} Bitmap integer for which account flags to set.
* &masterWeight={weight} The master key weight.
* &lowThreshold={weight} The sum weight for the low threshold.
* &medThreshold={weight} The sum weight for the medium threshold.
* &highThreshold={weight} The sum weight for the high threshold.
* &signer={weight:type:value} If `weight` is set to 0, remove a signer from
`source` account, else edit or add one. `type` can be either:
  * `key`: refer to another account
  * `tx`: refer to a transaction hash
  * `hash`: refer to a preimage or hash(x) signer
* &homeDomain={string} set homedomain, or unset it if `string` is empty
* &source={address}
