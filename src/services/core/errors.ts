import { Data } from "effect";

export class StorageKeyNotFoundError extends Data.TaggedError("StorageKeyNotFoundError")<{
    readonly message: string;
    // readonly cause: unknown;
}> {}

export class PailNotFoundError extends Data.TaggedError("PailNotFoundError")<{
    readonly message: string;
    // readonly cause: unknown;
}> {}

export class PailKeyNotFoundError extends Data.TaggedError("PailKeyNotFoundError")<{
    readonly message: string;
    // readonly cause: unknown;
}> {}

export class PartialKeyPailNotFoundError extends Data.TaggedError("PartialKeyPailNotFoundError")<{
    readonly message: string;
    // readonly cause: unknown;
}> {}


export class CorruptedPailEntryFound extends Data.TaggedError("CorruptedPailEntryFound")<{
    readonly message: string;
    // readonly cause: unknown;
}> {}
