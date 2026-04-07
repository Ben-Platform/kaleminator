import  { type Stream, Context } from "effect";

export class StellarEvents extends Context.Tag("StellarEvents")<
    StellarEvents,
    {
        // TODO: unknown will be StellarEvent type probably
        readonly watchContract: (contractId: string) => Stream.Stream<unknown, Error, never>;
    }
>() {}