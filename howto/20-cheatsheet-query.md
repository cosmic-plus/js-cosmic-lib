```
/** Link general syntax **/
...?{operation}&{...transaction_or_operation_fields}
...?transaction&{...transaction_fields}&operation={operation}&{...operation_fields}&{...more_operations}
...?xdr={xdr}&network={"public"|"test"|passphrase}&[stripSource|stripSequence|stripSignatures]&[callback={url}]&[horizon={url}]

/** Transaction optional fields **/
&network="public"|"test"|{passphrase}
&horizon={url}
&callback={url}
&memo={message}|{memoType}:{memoValue} // memoType = text|id|hash|return
&source={address}
&minTime={YYYY-MM-DD}|{YYYY-MM-DDTHH:mm:ssZ}|+{minutes}
&maxTime={YYYY-MM-DD}|{YYYY-MM-DDTHH:mm:ssZ}|+{minutes}
&sequence={integer}
&fee={integer}

/** Operations fields **/

...?accountMerge&destination={address}
Optional: &source={address}

...?allowTrust&assetCode={string}&trustor={address}
Optional: &authorize=false&source={address}

...?bumpSequence&bumpTo={sequence}
Optional: &source={address}

...?changeTrust&asset={assetCode}:{assetIssuer}
Optional: &limit={integer}&source={address}

...?createAccount&destination={address}&initialBalance={amount}
Optional: &source={address}

...?createPassiveSellOffer&selling={assetCode}:{assetIssuer}&buying={assetCode}:{assetIssuer}&amount={amount}&price={price}|{buying}:{selling}
Note: buying or selling can be omitted for XLM.
Note: createPassiveOffer is still supported for backward compatibility.
Optional: &source={address}

...?inflation
Optional: &source={address}

...?manageData&name={string}
Optional: &value={string}&source={address}

...?manageBuyOffer&selling={assetCode}:{assetIssuer}&buying={assetCode}:{assetIssuer}&buyAmount={amount}&price={price}|{selling}:{buying}
Note: buying or selling can be omitted for XLM.
Optional: &offerId={integer}&source={address}
Delete offer: ...?manageBuyOffer&offerId={integer}&amount=0

...?manageSellOffer&selling={assetCode}:{assetIssuer}&buying={assetCode}:{assetIssuer}&amount={amount}&price={price}|{buying}:{selling}
Note: buying or selling can be omitted for XLM.
Note: manageOffer is still supported for backward compatibility.
Optional: &offerId={integer}&source={address}
Delete offer: ...?manageSellOffer&offerId={integer}&amount=0

...?pathPayment&destination={address}&destAmount={amount}&destAsset={assetCode:assetIssuer}
    &sendMax={amount}&sendAsset={assetCode}:{assetIssuer}
Note: destAsset or sendAsset can be omitted for XLM.
Optional: &path={asset1,asset2,...,assetN}&source={address}

...?payment&amount={amount}&destination={address}
Optional: &asset={assetCode}:{assetIssuer}&source={address}

...?setOptions
Optional: &inflationDest={address}&clearFlags={integer}&setFlags={integer}&masterWeight={weight}
    &lowThreshold={weight}&midThreshold={weight}&highThreshold={weight}&signer={weight}:{type}:{value}
    &homeDomain={string}&source={address}
Note: signer type can be `key`, `tx` or `hash`.
```
