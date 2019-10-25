```
/** Link general syntax **/
...?type={operation}&{...meta_fields|transaction_fields|operation_fields}
...?type=transaction&{...meta_fields|transaction_fields}&operation={operation}&{...operation_fields}&{...more_operations}
...?xdr={xdr}&{...meta_fields}&[strip=source|sequence|signatures]

/** Meta fields **/
network=public|test|{passphrase}
callback={url}
horizon={url}    // Fallback, only for custom networks

/** Transaction fields **/
&memo={message}|{memoType}:{memoValue}    // memoType = text|id|hash|return
&source={address}
&minTime={YYYY-MM-DD}|{YYYY-MM-DDTHH:mm:ssZ}|+{minutes}
&maxTime={YYYY-MM-DD}|{YYYY-MM-DDTHH:mm:ssZ}|+{minutes}
&sequence={integer}
&fee={integer}

/** Operations fields **/

...?type=accountMerge&destination={address}
Optional: &source={address}

...?type=allowTrust&assetCode={string}&trustor={address}
Optional: &authorize=false&source={address}

...?type=bumpSequence&bumpTo={sequence}
Optional: &source={address}

...?type=changeTrust&asset={assetCode}:{assetIssuer}
Optional: &limit={integer}&source={address}

...?type=createAccount&destination={address}&initialBalance={amount}
Optional: &source={address}

...?type=createPassiveSellOffer&selling={assetCode}:{assetIssuer}&buying={assetCode}:{assetIssuer}&amount={amount}&price={price}|{buying}:{selling}
Note: buying or selling can be omitted for XLM.
Note: createPassiveOffer is still supported for backward compatibility.
Optional: &source={address}

...?type=inflation
Optional: &source={address}

...?type=manageData&name={string}
Optional: &value={string}&source={address}

...?type=manageBuyOffer&selling={assetCode}:{assetIssuer}&buying={assetCode}:{assetIssuer}&buyAmount={amount}&price={price}|{selling}:{buying}
Note: buying or selling can be omitted for XLM.
Optional: &offerId={integer}&source={address}
Delete offer: ...?type=manageBuyOffer&offerId={integer}&amount=0

...?type=manageSellOffer&selling={assetCode}:{assetIssuer}&buying={assetCode}:{assetIssuer}&amount={amount}&price={price}|{buying}:{selling}
Note: buying or selling can be omitted for XLM.
Note: manageOffer is still supported for backward compatibility.
Optional: &offerId={integer}&source={address}
Delete offer: ...?type=manageSellOffer&offerId={integer}&amount=0

...?type=pathPayment&destination={address}&destAmount={amount}&destAsset={assetCode:assetIssuer}
    &sendMax={amount}&sendAsset={assetCode}:{assetIssuer}
Note: destAsset or sendAsset can be omitted for XLM.
Optional: &path={asset1,asset2,...,assetN}&source={address}

...?type=payment&amount={amount}&destination={address}
Optional: &asset={assetCode}:{assetIssuer}&source={address}

...?type=setOptions
Optional: &inflationDest={address}&clearFlags={integer}&setFlags={integer}&masterWeight={weight}
    &lowThreshold={weight}&midThreshold={weight}&highThreshold={weight}&signer={weight}:{type}:{value}
    &homeDomain={string}&source={address}
Note: signer type can be `key`, `tx` or `hash`.
```
