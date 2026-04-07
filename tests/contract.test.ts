import { Effect } from "effect";
import { nativeToScVal, scValToNative } from "@stellar/stellar-sdk";
import { getCurrentKaleBlockNumber, getKalePail, getKaleHarvestablePailList, getStorageValue, makeFarmKey, makeVecKey, PailId } from "@services/core";
import { StellarGateway } from "@services/infra";
import { SUBSCRIBER_ACCOUNT } from "./notsosecret.ts";
import { objDump, MainTestLayer } from "./shared.ts";
import { assert, assertEquals } from "@std/assert";
import { KALE_CONTRACT } from "./known-addresses.ts";


Deno.test("Get KALE Pail harvestable list for a subscriber", async () => {
    const test = Effect.gen(function* () {
        const list = yield* getKaleHarvestablePailList(SUBSCRIBER_ACCOUNT);

        yield* Effect.log(`KALE pail`).pipe(
            Effect.annotateLogs({
                list: list.join(",")
            })
        );

        assert(list.length > 0, `no harvestable pails detected`);
    }).pipe(
        Effect.timeout("60 seconds"),
        Effect.provide(MainTestLayer)
    )

    await Effect.runPromise(test);
});

Deno.test("Get latest KALE Pail from @services/core", async () => {
    const test = Effect.gen(function* () {
        const currentBlockNumber = yield* getCurrentKaleBlockNumber();

        const pail = yield* getKalePail(SUBSCRIBER_ACCOUNT, PailId(currentBlockNumber));

        yield* Effect.log(`KALE pail`).pipe(
            Effect.annotateLogs({
                pail: pail,
                zeros: pail.zeros,
                sequence: pail.sequence,
            })
        );
    }).pipe(
        Effect.provide(MainTestLayer)
    )

    await Effect.runPromise(test);
});

Deno.test("Get latest KALE Pail from @services/infra", async () => {
    const test = Effect.gen(function* () {
        const gw = yield* StellarGateway; 


        // NOTE: a harvest-able block number
        // Work sent: gap 49 for block 138239
        // 21:22:32.361Z [INFO] 🥬 Work tx hash: 6e2ebdbc2183c3195b58e6cc6f2fb7714c288aa02f038781dfaa7fe1482ec6e1
        const currentBlockNumber = yield* getCurrentKaleBlockNumber();
        yield* Effect.log(`getting kale pail id: ${currentBlockNumber}`)

        const key = makeVecKey([
            nativeToScVal("Pail", { type: "symbol" }),
            nativeToScVal(SUBSCRIBER_ACCOUNT, { type: "address" }),
            // fetch a "probably valid" block numnber = latest - some;
            nativeToScVal(currentBlockNumber, { type: "u32" })
        ]);

        const data = yield* gw.getContractData(KALE_CONTRACT, key);
        assert(data.entries.length > 0, `there must be a KALE pail`);

        assert(data.entries.length === 1, `there should only be 1 KALE pail`)
        //     LedgerEntryResult {
        //       lastModifiedLedgerSeq?: number;
        //       key: xdr.LedgerKey;
        //       val: xdr.LedgerEntryData;
        //       liveUntilLedgerSeq?: number;
        //     }
        const dataEntry = data.entries?.[0];
        const pail = dataEntry.val.contractData(); // only one entry should be there, cast to contractData

        yield* Effect.log(`KALE pail`).pipe(
            Effect.annotateLogs({
                pailXdr: pail.toXDR("base64"), //scValToNative(pailData.key()),
                key: scValToNative(pail.key()),
                keyXdr: pail.key().toXDR("base64"),
                value: objDump(scValToNative(pail.val())),
            })
        );
    }).pipe(
        Effect.provide(MainTestLayer)
    )

    await Effect.runPromise(test);
});

Deno.test("Get latest KALE block number", async () => {
    // AAAAEAAAAAEAAAABAAAADwAAAAlGYXJtSW5kZXgAAAAAAAADAAIc3A==
    //  { 
    //    "key": { "vec": [ { "symbol": "KeyId"} ]} 
    //    "val": { "u32": 1 }
    //  }
    const test = Effect.gen(function* () {
        const gw = yield* StellarGateway;

        const instanceData = yield* gw.getContractInstanceData(KALE_CONTRACT);

        const farmIndexValue = yield* getStorageValue(
            instanceData.val.contractData().val().instance().storage() ?? [],
            makeFarmKey("FarmIndex") // vec [ { "symbol": "FarmIndex" } ]
        );
        
        yield* Effect.log(`KALE block number`).pipe(
            Effect.annotateLogs({
                found: farmIndexValue,
            })
        );

        assert(farmIndexValue, `could not find latest KALE block number`)

    }).pipe(
        Effect.provide(MainTestLayer),
    )

    await Effect.runPromise(test)
})

Deno.test("Get KALE contract instance data", async () => {
    const test = Effect.gen(function* () {
        const gw = yield* StellarGateway;

        const instanceData = yield* gw.getContractInstanceData(KALE_CONTRACT);

        const kaleData = instanceData.val.contractData().val().instance().storage()?.map(
            (entry) => entry
        );
        
        yield* Effect.log(`KALE instance data keys`).pipe(
            Effect.annotateLogs({
                keyValues: kaleData?.map(dataEntry => scValToNative(dataEntry.key())).join(","),
                kaleDataXdr: kaleData?.map(key => key.toXDR("base64"))
            })
        );

        assertEquals(
            kaleData?.map(dataEntry => scValToNative(dataEntry.key())).join(","), 
            "FarmBlock,FarmEntropy,FarmIndex,HomesteadAsset,Homesteader"
        );

    }).pipe(
        Effect.provide(MainTestLayer)
    )

    await Effect.runPromise(test);
    // "AAAAEAAAAAEAAAABAAAADwAAAAlGYXJtQmxvY2sAAAAAAAARAAAAAQAAAAoAAAAPAAAAB2VudHJvcHkAAAAADQAAACAAAAAFi9fURZ6WckaMoDEep92QUfWHJVX0dPk92WVzpQAAAA8AAAAHbWF4X2dhcAAAAAADAAAAKgAAAA8AAAAJbWF4X3N0YWtlAAAAAAAACgAAAAAAAAAAAAAAAALp6MkAAAAPAAAACW1heF96ZXJvcwAAAAAAAAMAAAAJAAAADwAAAAdtaW5fZ2FwAAAAAAMAAAADAAAADwAAAAltaW5fc3Rha2UAAAAAAAAKAAAAAAAAAAAAAAAAAAAAAAAAAA8AAAAJbWluX3plcm9zAAAAAAAAAwAAAAUAAAAPAAAAEG5vcm1hbGl6ZWRfdG90YWwAAAAKAAAAAAAAAAAAAAAAAAAAAAAAAA8AAAAMc3Rha2VkX3RvdGFsAAAACgAAAAAAAAAAAAAAAAAAAAAAAAAPAAAACXRpbWVzdGFtcAAAAAAAAAUAAAAAac1W7Q==",
    // FarmBlock

    // "AAAAEAAAAAEAAAABAAAADwAAAAtGYXJtRW50cm9weQAAAAANAAAAIAAAAAiq6XlBXBVTBrXROfz0zkLQ791VUOLqnMxqOJE5",
    // FarmEntropy

    // "AAAAEAAAAAEAAAABAAAADwAAAAlGYXJtSW5kZXgAAAAAAAADAAIb0w==",
    // FarmIndex

    // "AAAAEAAAAAEAAAABAAAADwAAAA5Ib21lc3RlYWRBc3NldAAAAAAAEgAAAAF1u0RwsaT/YezHKV6LjrdEGd1Ybu5ATN9SSZFdiQ4Idw==",
    // HomesteadAsset

    // "AAAAEAAAAAEAAAABAAAADwAAAAtIb21lc3RlYWRlcgAAAAASAAAAAAAAAABHW/KkWIcod4qCcTae4DlWEQP/zjVJQCzgpHnOvxsJ9Q=="
    // Homesteader
});

Deno.test("Get Contract Temporary Data", async () => {
    const test = Effect.gen((function* () {
        const gw = yield* StellarGateway; 

        // NOTE: a harvest-able block number
        // Work sent: gap 49 for block 138239
        // 21:22:32.361Z [INFO] 🥬 Work tx hash: 6e2ebdbc2183c3195b58e6cc6f2fb7714c288aa02f038781dfaa7fe1482ec6e1
        const currentKaleBlockNumber = yield* getCurrentKaleBlockNumber()

        const key = makeVecKey([
            nativeToScVal("Pail", { type: "symbol" }),
            nativeToScVal(SUBSCRIBER_ACCOUNT, { type: "address" }),
            nativeToScVal(currentKaleBlockNumber, { type: "u32" })
        ]);

        const data = yield* gw.getContractData(KALE_CONTRACT, key);

        yield* Effect.log(`contract data`).pipe(
            Effect.annotateLogs({
                dataXdr: data.entries.map(entry => entry.val.value().toXDR("base64")), 
            })
        );

        assert(data.entries.length > 0);        
    })).pipe(
        Effect.provide(MainTestLayer)
    );

    await Effect.runPromise(test);
});

Deno.test("Get Contract Instance Data", async () => {
    const test = Effect.gen(function* () {
        const gw = yield* StellarGateway; 

        const instanceData = yield* gw.getContractInstanceData(KALE_CONTRACT);

        yield* Effect.log(`get Contract Instance Data map`).pipe(
            Effect.annotateLogs({
                // AAAAAdf+RL0K8R1gKxCR8vSh9N8hLURNAyHqMq2zzBy7qwoEAAAAFAAAAAE=
                // {
                //     "contract": "CDL74RF5BLYR2YBLCCI7F5FB6TPSCLKEJUBSD2RSVWZ4YHF3VMFAIGWA",
                //     "key": "ledger_key_contract_instance",
                //     "durability": "persistent"
                // }
                keyXdr: instanceData.key.value().toXDR("base64"),

                // [
                //     `AAAAEAAAAAEAAAABAAAADwAAAAlGYXJtQmxvY2sAAAAAAAARAAAAAQAAAAoAAAAPAAAAB2VudHJvcHkAAAAADQAAACAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA8AAAAHbWF4X2dhcAAAAAADAAAAAAAAAA8AAAAJbWF4X3N0YWtlAAAAAAAACgAAAAAAAAAAAAAAAAMI1HwAAAAPAAAACW1heF96ZXJvcwAAAAAAAAMAAAAAAAAADwAAAAdtaW5fZ2FwAAAAAAP/////AAAADwAAAAltaW5fc3Rha2UAAAAAAAAKAAAAAAAAAAAAAAAAAAAAAAAAAA8AAAAJbWluX3plcm9zAAAAAAAAA/////8AAAAPAAAAEG5vcm1hbGl6ZWRfdG90YWwAAAAKAAAAAAAAAAAAAAAAAAAAAAAAAA8AAAAMc3Rha2VkX3RvdGFsAAAACgAAAAAAAAAAAAAAAAAAAAAAAAAPAAAACXRpbWVzdGFtcAAAAAAAAAUAAAAAac1ZUQ==`,
                //     "AAAAEAAAAAEAAAABAAAADwAAAAtGYXJtRW50cm9weQAAAAANAAAAIAAAAAiq6XlBXBVTBrXROfz0zkLQ791VUOLqnMxqOJE5",
                //     "AAAAEAAAAAEAAAABAAAADwAAAAlGYXJtSW5kZXgAAAAAAAADAAIb1Q==",
                //     "AAAAEAAAAAEAAAABAAAADwAAAA5Ib21lc3RlYWRBc3NldAAAAAAAEgAAAAF1u0RwsaT/YezHKV6LjrdEGd1Ybu5ATN9SSZFdiQ4Idw==",
                //     "AAAAEAAAAAEAAAABAAAADwAAAAtIb21lc3RlYWRlcgAAAAASAAAAAAAAAABHW/KkWIcod4qCcTae4DlWEQP/zjVJQCzgpHnOvxsJ9Q=="
                // ]
                valuesXdr: instanceData.val.contractData().val().instance().storage()?.map( // instance data is a key-value map
                    (entry) => entry.toXDR("base64")
                )
            }),
        );

        assertEquals(instanceData.key.value().toXDR("base64"), "AAAAAdf+RL0K8R1gKxCR8vSh9N8hLURNAyHqMq2zzBy7qwoEAAAAFAAAAAE=", 
            "Instance data doesn't match"
        );
    }).pipe(
        Effect.provide(MainTestLayer),
    );

    await Effect.runPromise(test);
})

