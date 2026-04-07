// tests/shared.ts
import { Layer } from "effect";
import { NetworkConfig, StellarGatewayLive, StellarHorizonLive, StellarRpcLive } from "@services/infra";

export const TestConfig = Layer.succeed(NetworkConfig, {
    rpcUrl: "https://soroban-rpc.mainnet.stellar.gateway.fm"
            // "https://mainnet.sorobanrpc.com" -- errors can happen due to network mismatch or node latency
            ,
    horizonUrl: "https://horizon.stellar.org/",
});

export const MainTestLayer = StellarGatewayLive.pipe(
    Layer.provide(StellarRpcLive),
    Layer.provide(StellarHorizonLive),
    Layer.provide(TestConfig),
);

//
// CB23WRDQWGSP6YPMY4UV5C4OW5CBTXKYN3XEATG7KJEZCXMJBYEHOUOV
// { "symbol": "mint" } = AAAADwAAAARtaW50 ->  ["AAAADwAAAARtaW50", "*", "*"]
//                                          -> ["AAAADwAAAARtaW50", "**"]
// fn_call: harvest -> fn_call: mint -> contract_event: mint
// ScVal -> { "string": "GWA...Z"}

export const objDump = (obj: unknown) => 
    JSON.stringify(obj, (key, value) => typeof value === 'bigint' ? value.toString() : value);