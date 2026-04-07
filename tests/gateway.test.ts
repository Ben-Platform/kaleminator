import { Chunk, Effect, Fiber, Option, Stream } from "effect";
import { assert, assertEquals } from "@std/assert";
import { StellarGateway } from "@services/infra/";
import { makeTopicXdr } from "@services/core";
import { Keypair, nativeToScVal, scValToNative } from "@stellar/stellar-sdk";
import { BEN_SUBSCRIPTIONS, KALE_ASSET, KALE_SAC } from "./known-addresses.ts";
import { MainTestLayer } from "./shared.ts";
import { AUET_SECRET } from "./notsosecret.ts";

Deno.test("Stellar Gateway health ping", async () => {
    const test = Effect.gen(function* () {
        const gw = yield* StellarGateway;

        const status = yield* gw.getHealth();
        
        return status;
    }).pipe(
        Effect.timeout("5 seconds"),
        Effect.provide(MainTestLayer)
    );

    const result = await Effect.runPromise(test);

    assertEquals(result.status, "healthy");
});

Deno.test("Monitor detects at least one event", async () => {
    const test = Effect.gen(function* () {
        const gw = yield* StellarGateway;

        const eventsChunk = yield* gw.monitorContractEvents(KALE_SAC, {})
            .pipe(
                Stream.take(1),
                Stream.runCollect,
            );

        const event = Chunk.get(eventsChunk, 0);
        if (Option.isSome(event)) {
            const anyEvent = event.value;
            yield* Effect.log(`Any Event`).pipe(
                Effect.annotateLogs({
                    ledger: anyEvent.ledger,
                    amount: scValToNative(anyEvent.value),
                    topics: anyEvent.topic.map((topic) => scValToNative(topic)).join(","),
                }),
            );
        }

        assert(eventsChunk.length > 0);
    }).pipe(
        Effect.timeout("30 seconds"),
        Effect.provide(MainTestLayer),
    );

    await Effect.runPromise(test);
});

Deno.test("Monitor detects at least one mint event", async () => {
    const test = Effect.gen(function* () {
        const gw = yield* StellarGateway;

        // Stellar Asset Contract (CAP 0046-06)
        // topics `["mint", to: Address, sep0011_asset: String]
        const mintTopics = [
            makeTopicXdr(nativeToScVal("mint", { type: "symbol" })),
            "*",
            "*",
        ];

        const eventsChunk = yield* gw.monitorContractEvents(KALE_SAC, {
            startLedger: 61880500,
            filterTopics: mintTopics,
        }).pipe(
            Stream.take(1),
            Stream.runCollect,
        );

        // https://stellar.expert/explorer/public/tx/a0ea91ac6ffa48f0bca4ea4d8b94fb0b2945b4c1a53e2e833ce0bffc2a3cf98f
        const event = Chunk.get(eventsChunk, 0);
        if (Option.isSome(event)) {
            const mintEvent = event.value;
            yield* Effect.log(`Mint Event`).pipe(
                Effect.annotateLogs({
                    ledger: mintEvent.ledger,
                    amount: scValToNative(mintEvent.value),
                    topics: mintEvent.topic.map((topic) => scValToNative(topic)).join(","),
                }),
            );
        }

        assert(eventsChunk.length > 0);
    }).pipe(
        Effect.timeout("30 seconds"),
        Effect.provide(MainTestLayer),
    );

    await Effect.runPromise(test);
});

Deno.test("Detect a historic transfer from any address to subscriptions address", async () => {
    const test = Effect.gen(function* () {
        const gw = yield* StellarGateway;

        // Soroban Token (SEP-41)
        // topics - `["transfer", from: Address, to: Address, asset: string]`
        const transferTopics = [
            makeTopicXdr(nativeToScVal("transfer", { type: "symbol" })),
            "*",
            makeTopicXdr(nativeToScVal(BEN_SUBSCRIPTIONS, { type: "address" })),
            makeTopicXdr(nativeToScVal(KALE_ASSET, { type: "string" })),
        ];

        const startLedger = 61996760;
        const eventsChunk = yield* gw.monitorContractEvents(KALE_SAC, {
            startLedger,
            filterTopics: transferTopics,
        }).pipe(
            Stream.take(1),
            Stream.runCollect,
            // Effect.catchTag("StellarNetworkError", (error) => Effect.log(`${error.cause}`))
        );

        const event = Chunk.get(eventsChunk, 0);
        if (Option.isSome(event)) {
            const transferEvent = event.value;
            yield* Effect.log(`Transfer Event`).pipe(
                Effect.annotateLogs({
                    ledger: transferEvent.ledger,
                    amount: scValToNative(transferEvent.value),
                    topics: transferEvent.topic.map((topic) => scValToNative(topic)).join(","), // TODO: custom formatters or leave as json
                }),
            );
        }

        const events = Chunk.toArray(eventsChunk);
        assert(events.length > 0);
    }).pipe(
        Effect.timeout("60 seconds"),
        Effect.provide(MainTestLayer),
    );

    await Effect.runPromise(test);
});

Deno.test("Detect a LIVE, real-time transfer to subscriptions address", async () => {
    // prepare payment from G acc
    // watch incoming payments from current ledger
    // send payment to Sub acc
    // detect payment
    // assert amounts
    const test = Effect.gen(function* () {
        const gw = yield* StellarGateway;

        // Soroban Token (SEP-41)
        // topics - `["transfer", from: Address, to: Address, asset: string]`
        const transferTopics = [
            nativeToScVal("transfer", { type: "symbol" }).toXDR("base64"), // xdr.ScVal.scvSymbol("transfer").toXDR("base64"),
            "*",
            nativeToScVal(BEN_SUBSCRIPTIONS, { type: "address" }).toXDR("base64"), //xdr.ScVal.scvAddress(Address.fromString(BEN_SUBSCRIPTIONS).toScAddress(),).toXDR("base64"),
            nativeToScVal(KALE_ASSET, { type: "string" }).toXDR("base64"),
        ];

        const watcherFiber = yield* gw.monitorContractEvents(KALE_SAC, {
            filterTopics: transferTopics,
        }).pipe(
            Stream.take(1),
            Stream.runCollect,
            Effect.fork,
        );

        yield* Effect.log("Monitor is live in the background...");

        // send payment
        const signer = Keypair.fromSecret(Deno.env.get("AUET_TEST_SECRET") ?? AUET_SECRET);

        const paymentAmount = 1n;
        yield* Effect.log(`sending payment of: ${paymentAmount} KALE`);
        const txResult = yield* gw.transfer(signer, KALE_SAC, signer.publicKey(), BEN_SUBSCRIPTIONS, paymentAmount, {});
        yield* Effect.log(`tx payment result: ${txResult.status}, ${txResult.txHash}`);

        const eventsChunk = yield* Fiber.join(watcherFiber);
        const events = Chunk.toArray(eventsChunk);

        const event = Chunk.get(eventsChunk, 0);

        if (Option.isSome(event)) {
            const transferEvent = event.value;
            yield* Effect.log(`Transfer Event`).pipe(
                Effect.annotateLogs({
                    ledger: transferEvent.ledger,
                    amount: scValToNative(transferEvent.value),
                    topics: transferEvent.topic.map((topic) => scValToNative(topic)).join(","),
                }),
            );
        }

        assert(events.length > 0);
    }).pipe(
        Effect.timeout("60 seconds"),
        Effect.provide(MainTestLayer),
    );

    await Effect.runPromise(test);
});

Deno.test("Send a refund from Subscription's address", () => {
    // prepare payment from G acc
    // watch incoming payments from current ledger
    // send payment to Sub acc
    // detect payment
    // assert amount received is higher than required
    // send back refund
});
