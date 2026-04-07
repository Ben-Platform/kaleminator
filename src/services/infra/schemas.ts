import { Schema } from "effect";

export const RpcConfig = Schema.Struct({
    url: Schema.String,
});

export interface RpcConfig extends Schema.Schema.Type<typeof RpcConfig> {};

export const ClassicPayment = Schema.Struct({
    _tag: Schema.Literal("Classic"), 
    from: Schema.String, 
    to: Schema.String, 
    asset: Schema.String,
    amount: Schema.String,
});

export const SorobanPayment = Schema.Struct({
    _tag: Schema.Literal("Soroban"), 
    contractId: Schema.String, 
    from: Schema.String, 
    to: Schema.String, 
    amount: Schema.BigIntFromSelf,
})

export const PaymentRequest = Schema.Union(ClassicPayment, SorobanPayment);
export type PaymentRequest = Schema.Schema.Type<typeof PaymentRequest>;