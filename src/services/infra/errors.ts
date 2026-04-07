import { Data } from "effect";
import type { TimeoutException } from "effect/Cause";

export class XdrError extends Data.TaggedError("XdrError")<{
    readonly message: string;
    readonly cause: unknown;
}> {}

export class StellarNetworkError extends Data.TaggedError("StellarNetworkError")<{
    readonly message: string;
    readonly cause: unknown;
}> {}

export class StellarRpcError extends Data.TaggedError("StellarRpcError")<{
    readonly message: string;
    readonly cause: unknown;
}> {}

export class AccountNotFoundError extends Data.TaggedError("AccountNotFoundError")<{
    readonly address: string;
    readonly cause: unknown;
}> {}
    
export class TransactionError extends Data.TaggedError("TransactionError")<{
    readonly message: string;
    readonly cause: unknown;
}> {}

export class TransferError extends Data.TaggedError("TransferError")<{
    readonly message: string;
    readonly cause: unknown;
}> {}

export class ContractCallSimulationError extends Data.TaggedError("ContractCallSimulationError")<{
    readonly message: string;
    readonly cause: unknown;
}> {}

export class ContractNotFoundError extends Data.TaggedError("ContractNotFoundError")<{
    readonly message: string;
    readonly cause: unknown;
}> {}

export class ContractKeyNotFoundError extends Data.TaggedError("KeyNotFoundError")<{
    readonly message: string;
    readonly cause: unknown;
}> {}

export type NetworkError = 
    | StellarNetworkError
    | StellarRpcError;

export type ContractError =
    | ContractCallSimulationError
    | ContractNotFoundError
    | ContractKeyNotFoundError;

export type AccountError = 
    | StellarNetworkError
    | AccountNotFoundError;

export type GatewayError =
    | NetworkError
    | AccountError
    | ContractError
    | TransferError
    | TransactionError
    | TimeoutException;
