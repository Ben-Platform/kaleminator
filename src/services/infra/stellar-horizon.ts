import { Context, Effect, Layer } from "effect";
import { Horizon } from "@stellar/stellar-sdk";
import { NetworkConfig } from "./config.ts";

export class StellarHorizon extends Context.Tag("StellarHorizon")<
    StellarHorizon,
    { readonly server: Horizon.Server }
>() {}

export const StellarHorizonLive = Layer.effect(
    StellarHorizon,
    Effect.gen(function* () {
        const config = yield* NetworkConfig;

        return {
            server: new Horizon.Server(config.horizonUrl),
        };
    }),
);