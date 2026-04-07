import { Context, Effect, Layer } from "effect";
import { rpc } from "@stellar/stellar-sdk";
import { NetworkConfig } from "./config.ts";

export class StellarRpc extends Context.Tag("StellarRpc")<
    StellarRpc,
    { readonly server: rpc.Server }
>() {}

export const StellarRpcLive = Layer.effect(
    StellarRpc,
    Effect.gen(function* () {
        const config = yield* NetworkConfig;

        return {
            server: new rpc.Server(config.rpcUrl),
        };
    }),
);

// TODO: V1 replace entire RPC sdk impl with Effect rpc
export const StellarRpcLiveV1 = Layer.scoped(
    StellarRpc, 
    Effect.acquireRelease(
        Effect.gen(function* () {
            const config = yield* NetworkConfig;

            return {
                server: new rpc.Server(config.rpcUrl),
            };
        }),
        (rpcLive) => Effect.sync(() => {
            
        })
    )
)
