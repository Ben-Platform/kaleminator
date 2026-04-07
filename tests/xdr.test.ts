import { makeVecKey, scValEquals } from "@services/core";
import { nativeToScVal, type xdr } from "@stellar/stellar-sdk";
import { assert } from "@std/assert";

const logTestOutput = (text: string) => Deno.stderr.writeSync(new TextEncoder().encode(text));

Deno.test("Compare two ScVals that are not equal", () => {
    const key1 = makeVecKey([
        nativeToScVal("KeyId", { type: "symbol" }), // xdr.ScVal.scvSymbol("FarmIndex");
        nativeToScVal(0xDEADBEEA, { type: "u32" })  // xdr.ScVal.scvU32(0xDEADBEEF);
    ]);

    const key2 = makeVecKey([
        nativeToScVal("KeyId", { type: "symbol" }),
        nativeToScVal(0xDEADBEEF, { type: "u32" })
    ]);

    assert(!scValEquals(key1)(key2), "keys should not match");
})

Deno.test("Compare two ScVals that are equal", () => {
    const key1 = makeVecKey([
        nativeToScVal("KeyId", { type: "symbol" }), // xdr.ScVal.scvSymbol("FarmIndex");
        nativeToScVal(0xDEADBEEF, { type: "u32" })  // xdr.ScVal.scvU32(0xDEADBEEF);
    ]);

    const key2 = makeVecKey([
        nativeToScVal("KeyId", { type: "symbol" }),
        nativeToScVal(0xDEADBEEF, { type: "u32" })
    ]);

    assert(scValEquals(key1)(key2), "keys don't match");

    const keyMap1 = makeVecKey([
        nativeToScVal("FarmIndex", { type: "symbol" }),
        // vec[symbol("id")]        
    ]);

    logTestOutput(`${key1.toXDR("base64")}`);

    const keyMap2 = makeVecKey([
        nativeToScVal("FarmIndex", { type: "symbol" }),
    ]);

    assert(scValEquals(keyMap1)(keyMap2), "keys don't match");
});

Deno.test("Find the ScVal value by passing an arm", async () => {
    // keyXdr="AAAAEAAAAAEAAAADAAAADwAAAARQYWlsAAAAEgAAAAAAAAAAyU+uKHDGlwniZfx9l0xVsXDHYLbm4Qe4CI1hkUQI6cIAAAADAAIgoA=="
    // pailXdr=AAAAAAAAAAHX/kS9CvEdYCsQkfL0ofTfIS1ETQMh6jKts8wcu6sKBAAAABAAAAABAAAAAwAAAA8AAAAEUGFpbAAAABIAAAAAAAAAAMlPrihwxpcJ4mX8fZdMVbFwx2C25uEHuAiNYZFECOnCAAAAAwACIKAAAAAAAAAAEQAAAAEAAAAEAAAADwAAAANnYXAAAAAAAQAAAA8AAAAIc2VxdWVuY2UAAAADA7Hc/QAAAA8AAAAFc3Rha2UAAAAAAAAKAAAAAAAAAAAAAAAAAAAAAAAAAA8AAAAFemVyb3MAAAAAAAAB

    const key = makeVecKey([
        nativeToScVal("id", { type: "symbol" }), // xdr.ScVal.scvSymbol("FarmIndex");
        nativeToScVal(0xDEADBEEF, { type: "u32" })  // xdr.ScVal.scvU32(0xDEADBEEF);
    ]);

    logTestOutput(`key: ${key.toXDR("base64")}`)

    const val = getValueFromScVal("scvU32", key);

    logTestOutput(`val found?: ${val}`)

})

export const getValueFromScVal = (arm: string, target: xdr.ScVal): unknown => {
    logTestOutput(`target.switch().name: ${target.switch().name}`)

    if (target.switch().name === arm) {
        return target.value();
    }

    if (target.switch().name === "scvVec") {
        const vector = target.vec();
        if (vector) {
            for (const child of vector) {
                const found = getValueFromScVal(arm, child);
                if (found !== undefined) return found;
            }
        }
    }

    if (target.switch().name === "scvMap") {
        const map = target.map();
        if (map) {
            for (const entry of map) {
                const found = getValueFromScVal(arm, entry.val());
                if (found !== undefined) return found;
            }
        }
    }

    return undefined;
};