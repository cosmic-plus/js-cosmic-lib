
/**
 * Contains Stellar transactions specification.
 *
 * @module
 */

/**
 * Transaction optional fields.
 */
export const transactionOptionalFields = [
  'network', 'memo', 'source', 'sequence',
  'minTime', 'maxTime', 'fee'
]

/**
 * Operation mandatory fields.
 */
export const operationMandatoryFields = {
  accountMerge: ['destination'],
  allowTrust: ['assetCode', 'trustor'],
  changeTrust: ['asset'],
  createAccount: ['destination', 'startingBalance'],
  createPassiveOffer: ['selling', 'buying', 'amount', 'price'],
  inflation: [],
  manageData: ['name'],
  manageOffer: ['selling', 'buying', 'amount', 'price'],
  pathPayment: ['sendAsset', 'sendMax', 'destination', 'destAsset', 'destAmount'],
  payment: ['asset', 'destination', 'amount'],
  setOptions: []
}

/**
 * Operation optionnal fields.
 */
export const operationOptionalFields = {
  accountMerge: ['source'],
  allowTrust: ['authorize', 'source'],
  changeTrust: ['limit', 'source'],
  createAccount: ['source'],
  createPassiveOffer: ['source'],
  inflation: ['source'],
  manageData: ['value', 'source'],
  manageOffer: ['offerId', 'source'],
  pathPayment: ['path', 'source'],
  payment: ['source'],
  setOptions: ['inflationDest', 'clearFlags', 'setFlags', 'masterWeight',
    'lowThreshold', 'medThreshold', 'highThreshold', 'signer', 'homeDomain',
    'source']
}

/**
 * Field types.
 */
export const fieldType = {
  amount: 'amount',
  asset: 'asset',
  assetCode: 'string',
  authorize: 'boolean',
  buying: 'asset',
  clearFlags: 'flags',
  destAsset: 'asset',
  destAmount: 'amount',
  destination: 'address',
  fee: 'amount',
  highThreshold: 'threshold',
  homeDomain: 'string',
  inflationDest: 'address',
  limit: 'amount',
  lowThreshold: 'threshold',
  masterWeight: 'weight',
  maxTime: 'date',
  medThreshold: 'threshold',
  memo: 'memo',
  minTime: 'date',
  network: 'network',
  offerId: 'string',
  price: 'price',
  name: 'string',
  path: 'assetsArray',
  selling: 'asset',
  sendAsset: 'asset',
  sendMax: 'amount',
  sequence: 'amount',
  setFlags: 'flags',
  signer: 'signer',
  source: 'address',
  startingBalance: 'amount',
  trustor: 'address',
  value: 'string'
}
