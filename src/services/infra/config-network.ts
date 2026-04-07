import { Config, Context, Layer } from "effect";

export class NetworkConfig extends Context.Tag("NetworkConfig")<
    NetworkConfig,
    {
        readonly rpcUrl: string;
        readonly horizonUrl: string;
    }
>() {}

export const NetworkConfigLive = Layer.effect(
    NetworkConfig,
    Config.all({
        rpcUrl: Config.string("RPC_URL"),
        horizonUrl: Config.string("HORIZON_URL"),
    }),
);
