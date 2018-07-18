```
 --- Global Configuration (1) ---
 cosmicLib.defaults.page       // The page to use instead of 'https://cosmic.link/'
 cosmicLib.defaults.network    // The fallback network ('public'|'test')
 cosmicLib.defaults.user       // The fallback source address (federated or accountId)

 --- Constructor ---
 var cosmicLink = new CosmicLink(uri, { ...options})
 var cosmicLink = new CosmicLink(query, {...options})
 var cosmicLink = new CosmicLink(json, {...options})
 var cosmicLink = new CosmicLink(tdesc, {...options})
 var cosmicLink = new CosmicLink(transaction, {...options})
 var cosmicLink = new CosmicLink(xdr, {...options})

 /* {...options} for any format */
 page, network                // See 'Global Configuration (1)' for more info

 /* {...options} for uri, query, json & tdesc */
 user                         // See 'Global Configuration (1)' for more info

 /* {...options} for transaction and xdr formats */
 stripSource: true            // Strip out source account
 stripSequence: true          // Strip out sequence number
 stripSignatures: true        // Strip out signatures

 --- Formats conversion (asynchronous) ---
 cosmicLink.getUri()          // Return a promise of the URI string
 cosmicLink.getQuery()        // Return a promise of the query string
 cosmicLink.getTdesc()        // Return a promise of the transaction descriptor
 cosmicLink.getJson()         // Return a promise of the stringified tdesc
 cosmicLink.getTransaction()  // Return a promise of the transaction
 cosmicLink.getXdr()          // Return a promise of the transaction's XDR

 --- Datas ---
 cosmicLink.page              // The base URI, without the query
 cosmicLink.network           // Test/Public network
 cosmicLink.server            // The horizon server in use
 cosmicLink.user              // User address
 cosmicLink.status            // Erroneous status of the cosmicLink or undefined
 cosmicLink.errors            // An array of errors (or undefined if no error)

 --- Datas (asynchronous) ---
 cosmicLink.getSource()         // Transaction source address
 cosmicLink.getSourceAccount()  // Transaction source account object
 cosmicLink.getSigners()        // Array of legit signers for the current transaction

 --- Tests (asynchronous)---
 cosmicLink.hasSigner(publicKey)  // Test if `publicKey` is a signer for cosmicLink
 cosmicLink.hasSigned(publicKey)  // Test if `publicKey` signature is already available

 --- Actions ---
 cosmicLink.selectNetwork()            // Select cosmicLink network in Stellar SDK
 cosmicLink.sign(...keypair|preimage)  // Sign the transaction
 cosmicLink.send()                     // Send the transaction to the network

 --- Edit ---
 cosmicLink.parse(any-format, {...options}) // Re-parse cosmicLink
 // cosmicLink.setField(field, value)
 // cosmicLink.addOperation({...params})
 // cosmicLink.editOperation(index, {...params})
 // cosmicLink.removeOperation(index)

 --- HTML Nodes ---
 cosmicLink.htmlNode         // HTML element for cosmicLink (contains the next ones)
 cosmicLink.transactionNode  // HTML description of the transaction
 cosmicLink.signersNode      // HTML element for the signers list
 cosmicLink.statusNode       // HTML element for the transaction status & errors

 --- Aliases ---
 cosmicLink.aliases                     // Local aliases for accountId
 cosmicLink.addAliases({id: name,...})  // Append new aliases
 cosmicLink.removeAliases([id...])      // Remove aliases

 --- Handlers ---
 cosmicLink.clickHandlers               // Click handlers for the HTML display
 cosmicLink.setClickHandler(fieldType, callback)
 cosmicLink.clearClickHandler(fieldType, callback)
 event = { cosmicLink..., fieldType: ..., field: ..., value: ..., node: ..., extra:... }

 cosmicLink.formatHandlers              // Format handlers are called on setup and when format is refreshed
 cosmicLink.addFormatHandler(format, callback)
 cosmicLink.removeFormatHandler(format, callback)
 event = { cosmicLink: ..., value: ..., error: ... }

 --- Global configuration (2) ---
 /** Aliases and handlers can be defined globally **/
 cosmicLib.defaults.aliases
 cosmicLib.defaults.addAliases({id: name,...})
 cosmicLib.defaults.removeAliases([id...])

 cosmicLib.defaults.clickHandlers
 cosmicLib.defaults.setClickHandler(fieldType, callback)
 cosmicLib.defaults.clearClickHandler(fieldType, callback)

 cosmicLib.defaults.formatHandlers
 cosmicLib.defaults.addFormatHandler(format, callback)
 cosmicLib.defaults.removeFormatHandler(format, callback)
```
