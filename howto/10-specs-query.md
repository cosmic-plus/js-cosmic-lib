# Cosmic links specifications

Cosmic links syntax mimic `js-stellar-sdk`
[Transactions](https://stellar.github.io/js-stellar-sdk/Transaction.html)
and [Operations](https://stellar.github.io/js-stellar-sdk/Operation.html)
methods.

## General syntax

### One-operation link

> ...?type={operation}&{field}={value}&{...more_fields}

Where `{field}` can be either a meta field, a transaction field or a valid field
for `{operation}`.

Example:

> <https://cosmic.link/?payment&memo=Donation&destination=tips*cosmic.link&amount=100>

### Multi-operation link

> ...?type=transaction&{...metaFields|transactionFields}&operation={operation}&{...operationFields}&{...more_operations}

Meta fields and transactions fields have to be provided prior to any operation,
then the operations should be described sequentially.

Example:

> <https://cosmic.link/?transaction&memo=Example&operation=setOptions&homeDomain=example.org&operation=manageData&name=Wallet&value=example-wallet>

### XDR link

> ...?xdr={xdr}&{...metaFields}[&strip=source|sequence|signatures]

* `&strip`: Remove an element from the original XDR transaction. Stripping out
  sequence means that the transaction request can get signed anytime in the
  future, possibly several times. Stripping out source means that it can get
  signed by any account.

Example:

> [https://cosmic.link/?xdr=AAAA...AA==&network=public&strip=source](https://cosmic.link/?xdr=AAAAAL2ef/Z7FpGtgUvkKaEg3uvy9IH+T9chWSUhQILKTk/NAAAAZAEMX34AAAADAAAAAAAAAAAAAAABAAAAAAAAAAUAAAABAAAAAIQ/AS7GRUBBd96ykumKKUFE92+oiwRuJ7KXuvPwwTQWAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==&network=public&strip=source)

## Fields

### Meta Fields

Those fields contains data that is not strictly-speaking part of the
transaction object, but that is essential to its validation. Those fields are
optional.

#### network

> &network=public|test|{passphrase}

Tie the transaction to a specific network. Network-less transaction requests are
interpreted as transactions that can be validated on any network.

#### horizon

> &horizon={url}

Provide a fallback Horizon node for custom network in case the client doesn't
know any.

#### callback

> &callback={url}

Provide the destination at which the signed transaction must be posted.

### Transaction fields

Those fields may be used in any transaction and are all of them are optionals.
For multi-operations links, `source` will become the default source for any
operation that doesn't define one. In cosmic links, having a `source` is
optional as the source can be set by the wallet service when signing.


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

> &minTime|maxTime={YYYY-MM-DD}
> &minTime|maxTime={YYYY-MM-DDTHH:mm:ssZ}

This is the ISO 8601 date format.

> &minTime|maxTime=+{minutes}

This is a syntactic sugar to define minTime/maxTime relatively to the current
time, in minutes. This gets immediately computed into the corresponding UTC
date.

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

#### bumpSequence

Set account sequence number to `bumpTo`.

Mandatory fields:

> ...?bumpSequence&bumpTo={sequenceNumber}

Optional fields:

* &source={address}

#### changeTrust

Accept `asset`.

> ...?changeTrust&asset={assetCode}:{assetIssuer}

Optional fields:

* &limit={integer} Maximum holding, if set to zero `source` will not accept
  `asset` anymore.
* &source={address}

#### claimClaimableBalance

Claim claimable balance `balanceId`

> ...?claimclaimableBalance&balanceId={id}

Optional fields:

* &source={address}


#### createAccount

Create account `destination` and send it `initialBalance` lumens.

> ...?createAccount&destination={address}&initialBalance={amount}

Optional fields:

* &source={address}


#### createPassiveSellOffer

Offer to passively sell `amount` `selling` for `price` `buying` / unit.

> ...?createPassiveSellOffer&selling={assetCode}:{assetIssuer}&buying={assetCode}:{assetIssuer}&amount={amount}&price={price}

Notes:

* Before protocol 11 update, this operation was named `createPassiveOffer`. The
  old name is still supported for backward compatibility.
* `selling` or `buying` field may be omitted when it is lumens.
* `price` can also be a fraction in the form `{1:2}` or `{sellAmount}:{buyAmount}`.

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


#### manageBuyOffer

Offer to buy `buyAmount` `buying` for `price` `selling` / unit.

> ...?manageBuyOffer&selling={assetCode}:{assetIssuer}&buying={assetCode}:{assetIssuer}&buyAmount={amount}&price={price}

Notes:

* `selling` or `buying` field may be omitted when it is lumens.
* `price` can also be a fraction in the form `{1:2}` or `{sellAmount}:{buyAmount}`.

Optional fields:

* &offerId={integer} Allow to edit an existing offer. Will delete it if
`amount` is set to 0.
* &source={address}

Syntactic sugar for deleting offer:

> ...?manageBuyOffer&offerId={integer}&amount=0

#### manageSellOffer

Offer to sell `amount` `selling` for `price` `buying` / unit.

> ...?manageSellOffer&selling={assetCode}:{assetIssuer}&buying={assetCode}:{assetIssuer}&amount={amount}&price={price}

Notes:

* `selling` or `buying` field may be omitted when it is lumens.
* `price` can also be a fraction in the form `{1:2}` or `{sellAmount}:{buyAmount}`.
* Before protocol 11 update, this operation was named `manageOffer`. The old
  name is still supported for backward compatibility.

Optional fields:

* &offerId={integer} Allow to edit an existing offer. Will delete it if
`amount` is set to 0.
* &source={address}

Syntactic sugar for deleting offer:

> ...?manageSellOffer&offerId={integer}&amount=0


#### pathPaymentStrictReceive

Send `destAmount` `destAsset` to `destination` for at most `sendMax` `sendAsset`
using the available offers for the conversion.

> ...?pathPaymentStrictReceive&destination={address}&destAmount={amount}&destAsset={assetCode}:{assetIssuer}&sendMax={amount}&sendAsset={assetCode}:{assetIssuer}

Notes:

* `destAsset` or `sendAsset` field may be omitted when it is lumens.
* Before protocol 12 update, this operation was named `pathPayment`. The old
  name is still supported for backward compatibility.

Optional fields:

* &path={asset1},{asset2},...,{assetN} Where each asset is
  `{assetCode}:{assetIssuer}` or `XLM`. Define a conversion path to follow. If
  neither `destAsset` or `sendAsset` are lumens, you'll likely need `&path=XLM`
  to set lumens as an intermediate conversion step.
* &source={address}

#### pathPaymentStrictSend

Send at least `destMin` `destAsset` to `destination` for `sendAmount`
`sendAsset` using the available offers for the conversion.

> ...?pathPaymentStrictSend&destination={address}&destMin={amount}&destAsset={assetCode}:{assetIssuer}&sendAmount={amount}&sendAsset={assetCode}:{assetIssuer}

Notes:

* `destAsset` or `sendAsset` field may be omitted when it is lumens.

Optional fields:

* &path={asset1},{asset2},...,{assetN} Where each asset is
  `{assetCode}:{assetIssuer}` or `XLM`. Define a conversion path to follow. If
  neither `destAsset` or `sendAsset` are lumens, you'll likely need `&path=XLM`
  to set lumens as an intermediate conversion step.
* &source={address}


#### payment

Send `amount` `asset` to `destination`.

> ...?payment&amount={amount}&destination={address}

Optional fields:

* &asset={assetCode}:{assetIssuer} Define `asset` when it is not lumens.
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
* &signer={weight}:{type}:{value} If `weight` is set to 0, remove a signer from
`source` account, else edit or add one. `type` can be either:
  * `key`: refer to another account
  * `tx`: refer to a transaction hash
  * `hash`: refer to a preimage or hash(x) signer
* &homeDomain={string} set homedomain, or unset it if `string` is empty
* &source={address}
