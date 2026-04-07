import { Effect, Option, pipe, Array as EffectArray } from "effect";
import { StellarGateway } from "@services/infra";
import { Address, nativeToScVal, scValToNative, xdr } from "@stellar/stellar-sdk";
import { PailKeyNotFoundError, StorageKeyNotFoundError } from "./errors.ts";
import { type Pail, PailId } from "./types-kale.ts";

const KALE_CONTRACT = Deno.env.get("KALE_CONTRACT") ?? "CDL74RF5BLYR2YBLCCI7F5FB6TPSCLKEJUBSD2RSVWZ4YHF3VMFAIGWA";

export const getStorageValue = (storage: Array<xdr.ScMapEntry>, targetKey: xdr.ScVal) =>
    Effect.fromNullable(
        storage.find(entry => scValEquals(targetKey)(entry.key()))
    ).pipe(
        Effect.map(entry => scValToNative(entry.val())), // get the actual value tied to found key
        Effect.orElseFail(() => new StorageKeyNotFoundError({
            message: `key not found, keyXdr: ${targetKey.toXDR("base64")}`,
        }))
    );

export const scValEquals = (target: xdr.ScVal) => (current: xdr.ScVal) => 
    current.toXDR("base64") === target.toXDR("base64")

export const makeVecKey = (items: Array<xdr.ScVal>) => xdr.ScVal.scvVec(items)

export const makeTopicXdr = (topic: xdr.ScVal) => topic.toXDR("base64");

export type ScValArm = ReturnType<xdr.ScVal["switch"]>["name"];

type ScValMap = {
    symbol: string, 
    address: string; 
    u32: number, 
    i32: number,
    i128: bigint,
    string: string, 
    boolean: boolean, 
};

const makeScVal = <T extends keyof ScValMap>(key: ScValMap[T], type: T) => 
    nativeToScVal(key, { type: type });

export const makeFarmKey = (name: string): xdr.ScVal => 
    makeVecKey(
    [
        makeScVal(name, "symbol")
    ]
    );

export const makePailKey = (userAddress: string, kaleBlockId: PailId): xdr.ScVal => 
    makeVecKey(
    [
        makeScVal("Pail", "symbol"), //nativeToScVal("Pail", { type: "symbol" }),
        makeScVal(userAddress, "address"),  //nativeToScVal(address, { type: "address" }),
        makeScVal(kaleBlockId, "u32") //nativeToScVal(PailId, { type: "u32" })
    ]
    );

export const getCurrentKaleBlockNumber = () => Effect.gen(function* () {
    const gw = yield* StellarGateway; 

    const instanceData = yield* gw.getContractInstanceData(KALE_CONTRACT);
    
    const blockNumber = yield* pipe(
        Option.fromNullable(instanceData.val.contractData().val().instance().storage()),
        Option.getOrElse(() => []), // TODO: or fail early?
        (storage) => getStorageValue(storage, makeFarmKey("FarmIndex")),
        Effect.map(Number)
    );
    
    return blockNumber;
});

export const getArmValueFromScVal = <T>(arm: ScValArm, target: xdr.ScVal): Option.Option<T> => {
    const current = target.switch() // a bit more efficient to call only once
    
    if (current.name === arm) {
        return Option.some(target.value() as T);
    }

    if (current.name === "scvVec") {
        const vector = target.vec();
        if (vector) {
            for (const child of vector) {
                const found = getArmValueFromScVal<T>(arm, child);
                if (Option.isSome(found)) return found;
            }
        }
    }

    if (current.name === "scvMap") {
        const map = target.map();
        if (map) {
            for (const entry of map) {
                const found = getArmValueFromScVal<T>(arm, entry.val());
                if (Option.isSome(found)) return found;
            }
        }
    }

    return Option.none();
};

export const getKalePail = (userAddress: string, kaleBlockId: PailId) => Effect.gen(function* () {
    const gw = yield* StellarGateway; 

    const data = yield* gw.getContractData(KALE_CONTRACT, makePailKey(userAddress, kaleBlockId));

    const entry = yield* pipe(
        Option.fromNullable(data.entries?.[0]), 
        Effect.mapError(() => new PailKeyNotFoundError({message: `Pail not found`}))
    );

    const pail = entry.val.contractData();

    const blockId = yield* pipe(
        getArmValueFromScVal<number>("scvU32", pail.key()), 
        Option.map(PailId), 
        // Effect.mapError(() => new PailNotFoundError({message: `Pail not found`}))
    );

    const owner = yield* pipe(
        getArmValueFromScVal<xdr.ScAddress>("scvAddress", pail.key()), 
        Option.map((scAddress) => Address.fromScAddress(scAddress).toString()),
        // Effect.mapError(() => new PailNotFoundError({message: `Pail not found`}))
    );

    const values = scValToNative(pail.val());

    // pail?.zeros && pail?.sequence
    const result: Pail = {
        blockId, 
        owner,
        zeros: values.zeros,
        sequence: values.sequence,
    }

    return result;
})

export const getKaleHarvestablePailList = (userAddress: string) => Effect.gen(function* () {
    const MAX_PAIL_COUNT = 288;  // 1 per 5min, 12 in 60min/1hr, 288 in 24hr
    const currentBlockNumber = yield* getCurrentKaleBlockNumber();

    const blockIds = Array.from(
        { length: MAX_PAIL_COUNT }, 
        (_, idx) => PailId(currentBlockNumber -idx)
    );

    const results = yield* Effect.forEach(blockIds, (pailId) => pipe(
        getKalePail(userAddress, pailId), 
        Effect.either
    ), { concurrency: 7 });
    
    const list = pipe(
        results, 
        EffectArray.getRights,
        EffectArray.filter((pail) => pail.zeros !== null),
        EffectArray.map((validPail) => validPail.blockId)
    )

    return list;
});