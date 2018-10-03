As CosmicLinks syntax is straightforward, it may feel more convenient to write
a few routines to produce them without relying on any additional dependency.

## XDR links

```js
const config = { page: 'https://cosmic.link/', network: 'test' }

function makeXdrUri (xdr) {
  return config.page + '?xdr=' + xdr + '&network=' + config.network
}

const uri = makeXdrUri('AAA...A==')
```

## Single-operation links

```js
const config = { page: 'https://cosmic.link/' }

function makeOperationUri (operation, arguments) {
  var query = '?' + operation
  for (let field in arguments) {
    query += '&' + field + '=' + encodeURIComponent(arguments[field])
  }
  return config.page + query
}

const uri = makeOperationUri('payment', { memo: 'donation', destination: 'tips*cosmic.link', amount: '20' })
```

## Multi-operation links

```js
const config = { page: 'https://cosmic.link/' }

function makeTransactionUrl (page, transactionFields, operations) {
  var query = '?transaction'
  for (let field in transactionFields) {
    query += '&' + field + '=' + encodeURIComponent(transactionFields[field])
  }
  operations.forEach(function (entry) {
    for (let field in entry) {
      query += '&' + field + '=' + encodeURIComponent(entry[field])
    }
  })
  return config.page + query
}

const uri = makeTransactionUrl({ memo: 'text:Example', minTime: '2018-07' },
  [
    { operation: 'setOptions', homeDomain: 'https://stellar.org' },
    { operation: 'manageData', name: 'updated', value: 'yes' },
    { operation: 'manageData', name: 'userID', value: '737' }
  ])
```
