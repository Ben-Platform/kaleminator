import { Effect, Random, Array as EffectArray, pipe, Option } from "effect";
import { MainTestLayer, objDump } from "./shared.ts";
import { HARVESTER_SECRET, SUBSCRIBER_ACCOUNT } from "./notsosecret.ts";
import { StellarGateway } from "@services/infra";
import { Keypair, nativeToScVal, scValToNative } from "@stellar/stellar-sdk";
import { getKaleHarvestablePailList, harvest } from "@services/core";
import { KALE_TRACTOR_CONTRACT } from "./known-addresses.ts";
import type { Api } from "@stellar/stellar-sdk/rpc";
import { assert, assertEquals } from "@std/assert";

Deno.test("Call Tractor Harvest using @services/core", async () => {
    const test = Effect.gen(function* () {
        const MAX_HARVEST_FOR_TESTING = 7;

        const list = yield* pipe(
            getKaleHarvestablePailList(SUBSCRIBER_ACCOUNT),
            Effect.andThen(EffectArray.take(MAX_HARVEST_FOR_TESTING))
        );

        yield* Effect.log(`harvesting: ${list}`);

        const signer = Keypair.fromSecret(Deno.env.get("HARVESTER_SECRET") ?? HARVESTER_SECRET);

        const results = yield* harvest(signer, SUBSCRIBER_ACCOUNT, list);

        const fmtResults = results
            .map(result => `{ PailId: ${result.pailId}, Amount: ${result.amount } }`)
            .join(", ");

        yield* Effect.log(`Kale harvested`).pipe(
            Effect.annotateLogs({
                results: fmtResults, 
                totalPails: results.length
            })
        )

        assertEquals(results.length, list.length, `did not harvest all pails`)

    }).pipe(
        Effect.timeout("60 seconds"), 
        Effect.provide(MainTestLayer)
    );

    await Effect.runPromise(test);

})

Deno.test("Call the Tractor's harvest function using @services/infra", async () => {
    const test = Effect.gen(function* () {
        const gw = yield* StellarGateway; 
        
        const signer = Keypair.fromSecret(Deno.env.get("HARVESTER_SECRET") ?? HARVESTER_SECRET);

        const MAX_HARVEST_AMOUNT = 1;
        const harvestPailId = yield* pipe(
            getKaleHarvestablePailList(SUBSCRIBER_ACCOUNT), 
            Effect.andThen(Random.shuffle), 
            Effect.andThen(EffectArray.take(MAX_HARVEST_AMOUNT)), // NOTE: take subset
            Effect.mapError(() => new Error("No harvestable pails available"))
        )

        yield* Effect.log(`harvesting Pails: ${harvestPailId}`);
        
        // fn harvest(farmer: Address, pails: Vec<u32>) -> Vec<i128>
        const response = yield* gw.invokeContractFn(
            signer, 
            KALE_TRACTOR_CONTRACT,
            "harvest",
            nativeToScVal(SUBSCRIBER_ACCOUNT, { type: "address" }),
            nativeToScVal(harvestPailId, { type: "u32" })
        ).pipe(
            Effect.tapError((error) => Effect.log(`cause: ${error.cause}`)),
        );

        yield* Effect.log(`KALE harvest transaction`).pipe(
            Effect.annotateLogs({
                tx_hash: response.txHash,
                tx_status: response.status,
            })
        );

        const returnValue = yield* pipe(
            Effect.succeed(response),
            Effect.filterOrElse(
                (res): res is Api.GetSuccessfulTransactionResponse => res.status === "SUCCESS", // type-guard
                (res) => Effect.fail(new Error(`Tx not successful, status: ${res.status}`))
            ),
            Effect.andThen((res) => Option.fromNullable(res.returnValue)),
            Effect.mapError(() => new Error("Contract unexpectedly returned no data"))
        );        

        yield* Effect.log(`Kale harvested`).pipe(
            Effect.annotateLogs({
                returnValue: scValToNative(returnValue),
                returnValueXdr: returnValue.toXDR("base64"),
            })
        )

        assert(scValToNative(returnValue).length >=0, `Tractor's harvest fn failed`);

    }).pipe(
        Effect.timeout("60 seconds"),
        Effect.provide(MainTestLayer)
    )

    await Effect.runPromise(test);
});

Deno.test("Harvest KALE using Tractor to sender account when received at least 1 KALE to subscriptions address", async () => {
});