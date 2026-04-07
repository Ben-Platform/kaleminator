import { Context, type Effect, type Stream } from "effect";
import type { Account, Horizon, Keypair, rpc, xdr } from "@stellar/stellar-sdk";
import type { AccountError, AccountNotFoundError, ContractError, GatewayError, NetworkError, StellarNetworkError } from "./errors.ts";

// unified
export class StellarGateway extends Context.Tag("StellarGateway")<
    StellarGateway,
    {
        readonly getHealth: () => 
            Effect.Effect<rpc.Api.GetHealthResponse, StellarNetworkError>;
        readonly getLatestLedger: () => 
            Effect.Effect<rpc.Api.GetLatestLedgerResponse, StellarNetworkError>;
        readonly getAccount: (address: string) => 
            Effect.Effect<Account, AccountError>;
        readonly getAccountInfo: (address: string) => 
            Effect.Effect<Horizon.AccountResponse, AccountError>;
        readonly monitorContractEvents: (
            address: string,
            options: WatchEventOptions,
        ) => Stream.Stream<rpc.Api.EventResponse, StellarNetworkError>;
        // basic operations support
        readonly transfer: (
            signer: Keypair,
            contractId: string, // TODO: or asset? reverse-lookup, check if SAC exists | Asset("A:I"), Contract("id")
            from: string,
            to: string,
            amount: bigint,
            options: TransferOptions,
        ) => Effect.Effect<rpc.Api.GetTransactionResponse, GatewayError>;
        // contract support
        readonly getContractInstanceData: (address: string) => 
            Effect.Effect<rpc.Api.LedgerEntryResult, ContractError | NetworkError>;
        readonly getContractData: (address: string, key: xdr.ScVal) => 
            Effect.Effect<rpc.Api.GetLedgerEntriesResponse, ContractError | NetworkError>;
        readonly invokeContractFn: (
            signer: Keypair, 
            contractId: string, 
            fnName: string, 
            ...params: ReadonlyArray<xdr.ScVal>
        ) => Effect.Effect<rpc.Api.GetTransactionResponse, GatewayError>;
    }
>() {}

export interface WatchEventOptions {
    readonly startLedger?: number;
    readonly filterTopics?: Array<string>;
    readonly cursor?: string;
}

export interface TransferOptions {
    readonly sponsor?: Keypair | FeebumpService | RelayerService;
}

export interface FeebumpService {
    readonly name: string; // Layer
    readonly url: string;
}

export interface RelayerService {
    readonly name: string; // Layer
    readonly url: string;
}

export interface TransferInfo {
    readonly status: string,
}