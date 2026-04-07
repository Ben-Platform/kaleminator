import { Effect, Stream } from "effect";
import { StellarGateway } from "@services/infra";
import { Keypair, nativeToScVal, scValToNative } from "@stellar/stellar-sdk";
import { getKaleHarvestablePailList, harvest } from "@services/core";

const BEN_SUBSCRIPTIONS = "GCXCIWH5OS7GJYSFJOWHB3PRBRER3A66O24EKK75MU3QMVQEEN7MYBEN";
const KALE_ASSET = "KALE:GBDVX4VELCDSQ54KQJYTNHXAHFLBCA77ZY2USQBM4CSHTTV7DME7KALE";
const KALE_SAC = "CB23WRDQWGSP6YPMY4UV5C4OW5CBTXKYN3XEATG7KJEZCXMJBYEHOUOV";

export const startService = Effect.gen(function* () {
    yield* Effect.log(`Starting Service...`);

    const gw = yield* StellarGateway; 

    const transfer = [
        nativeToScVal("transfer", { type: "symbol" }).toXDR("base64"), // xdr.ScVal.scvSymbol("transfer").toXDR("base64"),
        "*",
        nativeToScVal(BEN_SUBSCRIPTIONS, { type: "address" }).toXDR("base64"), //xdr.ScVal.scvAddress(Address.fromString(BEN_SUBSCRIPTIONS).toScAddress(),).toXDR("base64"),
        nativeToScVal(KALE_ASSET, { type: "string" }).toXDR("base64"),
    ];

    yield* Effect.log(`Monitoring events...`);
    const eventStream = gw.monitorContractEvents(KALE_SAC, {
        filterTopics: transfer,
    });

    yield* Stream.runForEach(eventStream, (event) => Effect.gen(function* () {
        yield* Effect.log(`Transfer event detected...`);

        // event: transfer, [SENDER],...7MYBEN,KALE:GBDVX4VELCDSQ54KQJYTNHXAHFLBCA77ZY2USQBM4CSHTTV7DME7KALE"
        yield* Effect.log(`event: ${(event.topic.map(topic => scValToNative(topic)))}`);

        const sender = scValToNative(event.topic[1]);
        yield* Effect.log(`Harvesting KALE for sender: ${sender}`);
        
        const pails = yield* getKaleHarvestablePailList(sender);

        if (pails.length > 0) {
            yield* Effect.log(`Harvesting ${pails.length} Pails for sender: ${sender}`);
            
            const signer = Keypair.fromSecret(Deno.env.get("HARVESTER_SECRET") ?? "NONE");
            const results = yield* harvest(signer,sender, pails);

            const fmtResults = results
                .map(result => `{ PailId: ${result.pailId}, Amount: ${result.amount } }`)
                .join(", ");

            yield* Effect.log(`Kale harvested`).pipe(
                Effect.annotateLogs({
                    results: fmtResults, 
                    totalPails: results.length
                })
            )
        } else {
            yield* Effect.log(`No Pails to harvest for sender: ${sender}`);
        }
    }));
});