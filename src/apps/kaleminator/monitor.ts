import { Effect, Stream } from "effect";
import { Keypair, nativeToScVal as toScVal, scValToNative } from "@stellar/stellar-sdk";
import { getKaleHarvestablePailList, harvest, makeTopicXdr } from "@services/core";
import { StellarGateway } from "@services/infra";

const BEN_SUBSCRIPTIONS = Deno.env.get("BEN_SUBSCRIPTIONS") ?? "GCXCIWH5OS7GJYSFJOWHB3PRBRER3A66O24EKK75MU3QMVQEEN7MYBEN";
const KALE_ASSET =  Deno.env.get("KALE_ASSET") ?? "KALE:GBDVX4VELCDSQ54KQJYTNHXAHFLBCA77ZY2USQBM4CSHTTV7DME7KALE";
const KALE_SAC = Deno.env.get("KALE_SAC") ?? "CB23WRDQWGSP6YPMY4UV5C4OW5CBTXKYN3XEATG7KJEZCXMJBYEHOUOV";

export const startService = Effect.gen(function* () {
    const HARVESTER = Keypair.fromSecret(Deno.env.get("HARVESTER_SECRET") ?? "NONE");

    yield* Effect.log(`Starting Service...`);

    const gw = yield* StellarGateway; 

    const transfer = [
        makeTopicXdr(toScVal("transfer", { type: "symbol" })), 
        "*",
        makeTopicXdr(toScVal(BEN_SUBSCRIPTIONS, { type: "address" })), 
        makeTopicXdr(toScVal(KALE_ASSET, { type: "string" })),
    ];

    yield* Effect.log(`Monitoring events...`);
    const eventStream = gw.monitorContractEvents(KALE_SAC, {
        filterTopics: transfer,
    });

    yield* Stream.runForEach(eventStream, (event) => Effect.gen(function* () {
        // event: transfer, [SENDER], [RECEIVER], [ASSET]
        const [ evType, sender, receiver, asset ] = event.topic.map(scValToNative);

        yield* Effect.log(`Processing ${evType} event`).pipe(
            Effect.annotateLogs({
                sender, 
                receiver, 
                asset,
                ledger: event.ledger,
                tx_hash: event.txHash,
                amount: scValToNative(event.value),
            })
        )
        
        const pails = yield* getKaleHarvestablePailList(sender);

        if (pails.length > 0) {
            yield* Effect.log(`Harvesting Kale`).pipe(
                Effect.annotateLogs({
                    subscriber: sender, 
                    pailCount: pails.length
                })
            );
            
            const results = yield* harvest(HARVESTER, sender, pails);

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