import { Chunk, Effect, Layer, Ref, Schedule, Stream } from "effect";
import {
Address,
    Contract,
    type Horizon,
    type Keypair,
    nativeToScVal,
    Networks,
    rpc,
    type Transaction,
    TransactionBuilder,
    xdr,
} from "@stellar/stellar-sdk";

import { StellarGateway, type TransferOptions, type WatchEventOptions } from "./stellar-gateway.ts";
import { StellarHorizon } from "./stellar-horizon.ts";
import { StellarRpc } from "./stellar-rpc.ts";
import { AccountNotFoundError, ContractCallSimulationError, ContractNotFoundError, StellarNetworkError, StellarRpcError, TransactionError } from "./errors.ts";

export const StellarGatewayLive = Layer.effect( // TODO: experiment with rate-limiting (rpc|horizon scoped resource)
    StellarGateway,
    Effect.gen(function* () {
        const rpcLive = yield* StellarRpc;
        const horizonLive = yield* StellarHorizon;

        return {
            getHealth: () => 
                getHealthV1(rpcLive.server),
            
            getLatestLedger: () => 
                getLatestLedger(rpcLive.server),
            
            getAccount: (address: string) => 
                getAccount(rpcLive.server, address),
            
            getAccountInfo: (address: string) => 
                getAccountInfoV1(horizonLive.server, address),
            
            monitorContractEvents: (address: string, options: WatchEventOptions) =>
                monitorContractEventsV1(rpcLive.server, address, options),
            
            transfer: (
                signer: Keypair,
                contractId: string,
                from: string,
                to: string,
                amount: bigint,
                options: TransferOptions,
            ) => transferV1(rpcLive.server, signer, contractId, from, to, amount,  options),
            
            getContractInstanceData: (address: string) => 
                getContractInstanceDataV1(rpcLive.server, address),

            getContractData: (address: string, key: xdr.ScVal) => 
                getContractDataV1(rpcLive.server, address, key),
            
            invokeContractFn: (
                signer: Keypair, 
                contractId: string, 
                fnName: string, 
                ...params: ReadonlyArray<xdr.ScVal>
            ) => invokeContractFnV1(rpcLive.server, signer, contractId, fnName, ...params),
        };
    }),
);

const invokeContractFnV1 = (
    server: rpc.Server, 
    signer: Keypair, 
    contractId: string, 
    fnName: string, 
    ...params: ReadonlyArray<xdr.ScVal>) => 
    Effect.gen(function* () {
        const source = yield* getAccount(server, signer.publicKey());
        

        const contract = new Contract(contractId);
        
        const tx = new TransactionBuilder(source, { fee: "1000" }) // NOTE: surge pricing may play a role in FAILED
            .addOperation(
                contract.call(fnName, ...params),
            )
            .setNetworkPassphrase(Networks.PUBLIC)
            .setTimeout(60) // or more if not using relayer
            .build();

        const simulation = yield* simulateTransaction(server, tx);

        const submitResponse = yield* submitTransaction(server, signer, tx, simulation);

        // export type GetTransactionResponse = GetSuccessfulTransactionResponse | GetFailedTransactionResponse | GetMissingTransactionResponse;
        // export enum GetTransactionStatus
        return submitResponse;

    });

const getContractDataV1 = (server: rpc.Server, address: string, key: xdr.ScVal) => 
    Effect.tryPromise({
        try: () => {
            const keyContractData = new xdr.LedgerKeyContractData({
                contract: new Address(address).toScAddress(), 
                key: key,
                durability: xdr.ContractDataDurability.temporary(),
            })

            const ledgerKey = xdr.LedgerKey.contractData(keyContractData);

            return server.getLedgerEntries(ledgerKey)
        },
        catch: (error) => new StellarNetworkError({ // TODO: check ERR_BAD_REQUEST, ETIMEDOUT, ENOTFOUND for error recovery
            message: `Couldn't get contract data `,
            cause: error
        })
    }).pipe(
        // Ensure we actually got an entry back
        Effect.filterOrElse(
            (response) => !!response.entries,
            (error) => new ContractNotFoundError({ message: `contract not found`, cause: error })
        )
    );

const getContractInstanceDataV1 = (server: rpc.Server, address: string) => 
    Effect.tryPromise({
        try: () => {
            return server.getContractData(address, xdr.ScVal.scvLedgerKeyContractInstance())
        },
        catch: (error) => new StellarNetworkError({
            message: `Couldn't get contract instance data `,
            cause: error
        })
    }).pipe(
        // Ensure we actually got an entry back
        Effect.filterOrElse(
            (res) => !!res.key,
            (error) => new ContractNotFoundError({ message: `contract not found`, cause: error })
        )
    );

const getAccount = (server: rpc.Server, address: string) =>
    Effect.tryPromise({
        try: () => server.getAccount(address),
        catch: (error) =>
            new AccountNotFoundError({
                address: address,
                cause: error,
            }),
    });

const getAccountInfoV1 = (server: Horizon.Server, address: string) =>
    Effect.tryPromise({
        try: () => server.loadAccount(address),
        catch: (error) =>
            new StellarNetworkError({
                message: `Horizon: couldn't load address`,
                cause: error,
            }),
    });

const getHealthV1 = (server: rpc.Server) =>
    Effect.tryPromise({
        try: () => server.getHealth(),
        catch: (error) =>
            new StellarNetworkError({
                message: `RPC error`,
                cause: error,
            }),
    });

const getLatestLedger = (server: rpc.Server) =>
    Effect.tryPromise({
        try: () => server.getLatestLedger(),
        catch: (error) =>
            new StellarNetworkError({
                message: `RPC error: couldn't get latest ledger`,
                cause: error,
            }),
    });

const simulateTransaction = (server: rpc.Server, tx: Transaction) =>
    Effect.tryPromise({
        try: () => server.simulateTransaction(tx),
        catch: (error) =>
            new StellarNetworkError({
                message: `Simulation failed`,
                cause: error,
            }),
    }).pipe(
        Effect.filterOrElse(
            (response) => !rpc.Api.isSimulationError(response),
            (response) =>
                new ContractCallSimulationError({
                    message: `Simulation failed`,
                    cause: (response as rpc.Api.SimulateTransactionErrorResponse).error,
                }),
        ),
    );

const submitTransaction = (
    server: rpc.Server,
    signer: Keypair,
    tx: Transaction,
    simulation: rpc.Api.SimulateTransactionResponse,
    // options?: TransactionOptions
) => Effect.gen(function* () {
    const finalTx = rpc.assembleTransaction(tx, simulation).build();
    finalTx.sign(signer);

    const sendResponse = yield* Effect.tryPromise({
        try: () => server.sendTransaction(finalTx),
        catch: (error) => new StellarNetworkError({
            message: `TX submission failed`,
            cause: error
        }),
    }).pipe(
        Effect.filterOrFail(
            (response) => response.status === "PENDING",
            (error) => { 
                const resultCode = error.errorResult?.result().switch();
                if (resultCode === xdr.TransactionResultCode.txInsufficientFee()) {
                    return new TransactionError({
                        message: `insufficient tx fee`, 
                        cause: error
                    })
                } else if (resultCode === xdr.TransactionResultCode.txInsufficientBalance()) {
                    return new TransactionError({
                        message: `insufficient xlm balance to cover fees`, // tx_insufficient_balance
                        cause: error
                    })
                }
                else {
                    return new StellarRpcError({
                        message: `could not send transaction`, 
                        cause: error
                    })
                }
            }
            
        )
    );

    const submitResponse = yield* Effect.tryPromise({
        try: () => server.pollTransaction(sendResponse.hash),
        catch: (error) => new StellarNetworkError({
            message: `TX status polling failed`,
            cause: error
        }),
    }).pipe(
        Effect.retry(Schedule.fixed("5 seconds")),
        Effect.timeout("60 seconds"),
    );

    return submitResponse;
});

const transferV1 = ( // TODO: move to TransferArgs
    server: rpc.Server,
    signer: Keypair,
    contractId: string,
    from: string,
    to: string,
    amount: bigint,
    options: TransferOptions,
) => Effect.gen(function* () {
    // fee payer
    const source = yield* getAccount(server, signer.publicKey());

    const contract = new Contract(contractId);
    // TODO: `from` doesn't have to be the fee payer, check `source`
    const tx = new TransactionBuilder(source, { fee: "1000" }) // NOTE: surge pricing may play a role in FAILED
        .addOperation(
            contract.call(
                "transfer",
                nativeToScVal(signer.publicKey(), { type: "address" }), // from
                nativeToScVal(to, { type: "address" }), // to
                nativeToScVal(amount, { type: "i128" }), // amount
            ),
        )
        .setNetworkPassphrase(Networks.PUBLIC)
        .setTimeout(60) // or more if not using relayer
        .build();

    const simulation = yield* simulateTransaction(server, tx);

    const submitResponse = yield* submitTransaction(server, signer, tx, simulation, );

    // export type GetTransactionResponse = GetSuccessfulTransactionResponse | GetFailedTransactionResponse | GetMissingTransactionResponse;
    // export enum GetTransactionStatus
    return submitResponse;
});

// BUG: might skip ledgers as we are always getting the latestLedger per cycle
const watchContractEventsV0 = (contractId: string, server: rpc.Server, options: WatchEventOptions) =>
    Stream.repeatEffect(
        Effect.gen(function* () {
            const latestLedger = yield* getLatestLedger(server);

            const response = yield* Effect.tryPromise({
                try: () =>
                    server.getEvents({
                        startLedger: options?.startLedger ?? latestLedger.sequence,
                        filters: [{
                            type: "contract",
                            contractIds: [contractId],
                            topics: options?.filterTopics ? [options.filterTopics] : undefined,
                        }],
                        //limit: 10,
                    }),
                catch: (error) => new Error(`get events error`, { cause: error }),
            });

            return Chunk.fromIterable(response.events);
        }),
    ).pipe(
        Stream.flattenChunks,
        Stream.schedule(Schedule.spaced("5 seconds")),
    );

const monitorContractEventsV1 = (server: rpc.Server, contractId: string, options: WatchEventOptions) => {
    return Stream.unwrap(Effect.gen(function* () {
        const latestLedger = yield* getLatestLedger(server);
        const startLedger = options?.startLedger ?? latestLedger.sequence;

        const currentLedger = yield* Ref.make(startLedger);

        return Stream.repeatEffect(
            Effect.gen(function* () {
                const fromLedger = yield* Ref.get(currentLedger);
                const loopLatest = yield* getLatestLedger(server);

                if (fromLedger > loopLatest.sequence) {
                    return Chunk.empty();
                }

                const response = yield* Effect.tryPromise({
                    try: () => server.getEvents({  // getEvents (rpc default timeout: 10 seconds)
                        startLedger: fromLedger,
                        filters: [{
                            type: "contract",
                            contractIds: [contractId],
                            topics: options?.filterTopics ? [options.filterTopics] : undefined,
                        }],
                    }),
                    catch: (error) => new StellarNetworkError({
                        message: `Monitor error detecting events`,
                        cause: error
                    }),
                }).pipe(
                    Effect.tapError((rpcError) => Effect.logError(`RPC failed:`, rpcError.toJSON()))
                );

                const nextLedger = response.events.length > 0
                    ? response.events[response.events.length - 1].ledger
                    : loopLatest.sequence + 1;

                yield* Ref.set(currentLedger, nextLedger);

                return Chunk.fromIterable(response.events);
            }),
        ).pipe(
            Stream.flattenChunks,
            Stream.schedule(Schedule.spaced("5 seconds")),
        );
    }));
};
