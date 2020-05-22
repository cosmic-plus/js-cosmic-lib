"use strict"
/**
 * Contains Stellar transactions specification.
 *
 * @exports specs
 */
const specs = exports

/**
 * Transaction optional fields.
 */
specs.transactionOptionalFields = [
  "network",
  "horizon",
  "callback",
  "memo",
  "source",
  "sequence",
  "minTime",
  "maxTime",
  "fee"
]

/**
 * Transaction field meaning.
 */
specs.fieldDesc = {
  network: "Network",
  horizon: "Horizon",
  callback: "Callback",

  memo: "Memo",
  source: "Source",
  sequence: "Sequence",
  minTime: "Valid after",
  maxTime: "Valid until",
  fee: "Fees"
}

/**
 * @param {string} field
 * @return {boolean}
 */
specs.isTransactionField = function (field) {
  return specs.transactionOptionalFields.find(name => name === field)
}

/**
 * Operation mandatory fields.
 */
specs.operationMandatoryFields = {
  accountMerge: ["destination"],
  allowTrust: ["authorize", "assetCode", "trustor"],
  bumpSequence: ["bumpTo"],
  changeTrust: ["asset"],
  createAccount: ["destination", "startingBalance"],
  createPassiveOffer: ["selling", "buying", "amount", "price"],
  createPassiveSellOffer: ["selling", "buying", "amount", "price"],
  inflation: [],
  manageData: ["name", "value"],
  manageOffer: ["selling", "buying", "amount", "price"],
  manageBuyOffer: ["selling", "buying", "buyAmount", "price"],
  manageSellOffer: ["selling", "buying", "amount", "price"],
  pathPaymentStrictReceive: [
    "sendAsset",
    "sendMax",
    "destination",
    "destAsset",
    "destAmount"
  ],
  pathPaymentStrictSend: [
    "sendAsset",
    "sendAmount",
    "destination",
    "destAsset",
    "destMin"
  ],
  payment: ["asset", "destination", "amount"],
  setOptions: []
}

/**
 * Operation optionnal fields.
 */
specs.operationOptionalFields = {
  accountMerge: ["source"],
  allowTrust: ["source"],
  bumpSequence: ["source"],
  changeTrust: ["limit", "source"],
  createAccount: ["source"],
  createPassiveOffer: ["source"],
  createPassiveSellOffer: ["source"],
  inflation: ["source"],
  manageData: ["source"],
  manageOffer: ["offerId", "source"],
  manageBuyOffer: ["offerId", "source"],
  manageSellOffer: ["offerId", "source"],
  pathPaymentStrictReceive: ["path", "source"],
  pathPaymentStrictSend: ["path", "source"],
  payment: ["source"],
  setOptions: [
    "inflationDest",
    "clearFlags",
    "setFlags",
    "masterWeight",
    "lowThreshold",
    "medThreshold",
    "highThreshold",
    "signer",
    "homeDomain",
    "source"
  ]
}

/**
 * Operations fields
 */
specs.operationFields = {}
for (let field in specs.operationMandatoryFields) {
  specs.operationFields[field] = specs.operationMandatoryFields[field].concat(
    specs.operationOptionalFields[field]
  )
}

/**
 * @param {string} type Operation type
 * @param {string} field
 * @return {boolean}
 */
specs.isOperationField = function (operation, field) {
  return specs.operationFields[operation].find(name => name === field)
}

/**
 * Field types.
 */
specs.fieldType = {
  amount: "amount",
  asset: "asset",
  assetCode: "string",
  assetIssuer: "address",
  authorize: "authorizeFlag",
  bumpTo: "sequence",
  buyAmount: "amount",
  buying: "asset",
  callback: "url",
  clearFlags: "flags",
  destAsset: "asset",
  destAmount: "amount",
  destMin: "amount",
  destination: "address",
  fee: "amount",
  highThreshold: "threshold",
  homeDomain: "string",
  horizon: "url",
  inflationDest: "address",
  limit: "amount",
  lowThreshold: "threshold",
  masterWeight: "weight",
  maxTime: "date",
  medThreshold: "threshold",
  memo: "memo",
  memoBinary: "hash",
  memoHash: "hash",
  memoId: "id",
  memoReturn: "hash",
  memoText: "string",
  memoType: "string",
  minTime: "date",
  network: "network",
  offerId: "string",
  price: "price",
  name: "string",
  path: "assetsArray",
  selling: "asset",
  sendAmount: "amount",
  sendAsset: "asset",
  sendMax: "amount",
  sequence: "sequence",
  setFlags: "flags",
  signer: "signer",
  signerHash: "hash",
  signerKey: "address",
  signerType: "string",
  signerTx: "id",
  signerWeight: "weight",
  source: "address",
  startingBalance: "amount",
  trustor: "address",
  value: "buffer"
}

/**
 * An array of each valid type for fields.
 */
specs.types = []
for (let field in specs.fieldType) {
  const type = specs.fieldType[field]
  specs.types.find(entry => entry === type) || specs.types.push(type)
}

/**
 * A neutral account ID meant to be replaced before signing & sending the
 * transaction.
 * @static
 */
specs.neutralAccountId =
  "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF"
