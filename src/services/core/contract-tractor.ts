import { Effect, Array as EffectArray, pipe } from "effect";
import type { HarvestedPail, PailId } from "./types.ts";
import { type Keypair, nativeToScVal, scValToNative } from "@stellar/stellar-sdk";
import { StellarGateway } from "@services/infra";
import type { Api } from "@stellar/stellar-sdk/rpc";

const KALE_TRACTOR_CONTRACT = Deno.env.get("KALE_TRACTOR_CONTRACT") ?? "CBGSBKYMYO6OMGHQXXNOBRGVUDFUDVC2XLC3SXON5R2SNXILR7XCKKY3";
const MAX_PAILS_PER_HARVEST = Number(Deno.env.get("MAX_PAILS_PER_HARVEST")) || 20;

export const harvest = (signer: Keypair, userAddress: string, pails: ReadonlyArray<PailId>) =>
    Effect.gen(function* () {
        const gw = yield* StellarGateway; 

        const harvestList = yield* pipe(
            Effect.succeed(pails), 
            Effect.map(EffectArray.chunksOf(MAX_PAILS_PER_HARVEST)),
            Effect.andThen((batches) =>
                Effect.forEach(batches, (batch) => 
                    pipe(
                        gw.invokeContractFn(
                            signer, KALE_TRACTOR_CONTRACT,
                            "harvest",
                            nativeToScVal(userAddress, { type: "address" }),
                            nativeToScVal(batch, { type: "u32" })
                        ),
                        Effect.map((res) => {
                            const scVal = (res as Api.GetSuccessfulTransactionResponse).returnValue;
                            const amounts = scVal ? scValToNative(scVal) as ReadonlyArray<bigint> : [];

                            return EffectArray.zipWith(batch, amounts, (id, amount) => ({
                                pailId: id, 
                                amount: amount
                            }));
                        })
                    ), 
                    { concurrency: 1 }
                )
            ),
            Effect.map(EffectArray.flatten)
        )

        return harvestList;
    });

export const getSum = (pails: Array<HarvestedPail>) => 
    pails.reduce((acc, pail) => acc + pail.amount, 0);

export const sumEffect = (pails: Array<HarvestedPail>) => 
    EffectArray.reduce(pails, 0, (acc, pail) => acc + pail.amount);