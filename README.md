# Architecture
## Directory break-out
`/apps`
  - **kaleminator**: main application

`/services`: exposes packages `@services/infra`, `@services/core`, `@services@ben-platform`
  - **infra**: deals with network Stellar-stack, as well as encode/decode xdr.
  - **core**: using infra, deals with KALE contracts and transactions
  - **ben-platform**: using core, adds domain-level logic and primitives for apps to use.

`/tests`: Deno tests for all services.

`/docs`: supporting technical and reference documents, includes SEPs and CAPs for reference.

## About naming
Some names used for Effects, functions, symbols, consts, etc. are intentionally long and  explicit. Remember this repo is also to be used as a learning repo for `Ben Learn` lessons/sessions.

## Conventions 
- `signer`: functions that transact have a `signer` (Keypair) as first param. This is to clearly differentiate from read-only functions. 
- Low-level functions have a `V#` suffix (e.g. "`getHealthV1`") to iterate without breaking (enabling future how-swapping).

## About file placeholders
We have empty files that represent placeholders for vNext refactoring and/or adding context logic. 


# Tech stack
- Deno 2.x
- Effect v3
- @stellar-sdk v14.6, using the **Minimal** variant to avoid Axios.


# Change to SDK minimal variant
- Required going into `/node_modules`, and `@stellar/stellar-sdk/lib/minimal/bindings/config.js:7:39`. Then updating `var _package = _interopRequireDefault(require("../../../package.json"));` (one more uplevel ../). Not sure if this is a bug (yet) or something related to using Deno. 


# stellar-rpc timeout limits (options.go)
- getHealth (default: 5 seconds)  
- getEvents (default: 10 seconds) 
- getNetwork (default: 5 seconds) 
- getVersionInfo (default: 5 seconds)
- getLatestLedger (default: 5 seconds)
- getLedgerEntries (default: 5 seconds)
- getTransaction (default: 5 seconds)
- getTransactions (default: 5 seconds)
- getLedgers (default: 5 seconds)
- sendTransaction (default: 15 seconds) 
- simulateTransaction (default: 15 seconds) 
- getFeeStats (default: 5 seconds)