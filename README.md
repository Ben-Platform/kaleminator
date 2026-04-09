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

## Payment (transfer) detection trigger
Currently, the monitor detects a payment (`transfer` event) sent to a designated address, and invokes a smart contract function (`harvest`) with params extracted from the event source (which include the payment sender). 


# Tech stack
- Deno 2.x
- Effect v3
- @stellar-sdk v14.6, using the **Minimal** variant to avoid Axios.


# Change to SDK minimal variant
- Required going into `/node_modules`, and `@stellar/stellar-sdk/lib/minimal/bindings/config.js:7:39`. Then updating `var _package = _interopRequireDefault(require("../../../package.json"));` (one more uplevel ../). Not sure if this is a bug (yet) or something related to using Deno. 

# Installation
- Git clone into local setup
- Run `deno install` to install dependencies
- You need an `.env` file so Deno can load it. There's a provided `.env.sample` that you can rename to `.env`.
- ALSO: Change/update/add `.env` values as required. You'll need at least `HARVESTER_SECRET` and `AUET_TEST_SECRET`, which are `SDT...` strings (secret for Keypair).

# Testing (and gotchas)
- If you are using using Visual Studio Code for test runners, note that the Deno/VSCODE extension has a problem with detecting environment variables (it doesn't care for the `--env-file` arg to `deno test`). To solve this, just create a `notsosecret.ts` file at `/tests`  with the missing ENV variables as a fallback. Check the `[your-test-file].test.ts` imports at the top of the test file for the ENV variables you may need to define in the `notsosecret.ts`file. Also, that file is included in .gitignore so it will only reside in your local setup.
- If you are running via terminal/console, make sure your `.env` file is good to go, and run `deno task test`. You can also use the `--filter [by]` to run partial test suites (e.g.: `deno task test --filter "env"`).


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