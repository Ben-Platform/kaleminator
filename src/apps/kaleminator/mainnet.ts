import { NetworkConfig, StellarGatewayLive, StellarHorizonLive, StellarRpcLive } from "@services/infra";
import { Layer } from "effect";


export const MainnetConfig = Layer.succeed(NetworkConfig, {
    rpcUrl: "https://soroban-rpc.mainnet.stellar.gateway.fm"
            // "https://mainnet.sorobanrpc.com" -- errors can happen due to network mismatch or node latency
            ,
    horizonUrl: "https://horizon.stellar.org/",
});

export const MainnetLayer = StellarGatewayLive.pipe(
    Layer.provide(StellarRpcLive),
    Layer.provide(StellarHorizonLive),
    Layer.provide(MainnetConfig),
);