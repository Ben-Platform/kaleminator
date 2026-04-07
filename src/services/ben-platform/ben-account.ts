import { Effect, Context, Layer } from "effect";
// TODO: we need our own dsl abstractions
import type { Account } from "@stellar/stellar-sdk";
import { StellarGateway } from "@services/infra";

export class AccountService extends Context.Tag("AccountService")<
    AccountService, 
    { readonly getAccount: (address: string) => Effect.Effect<Account, Error> }
>() {}

export const AccountServiceLive = Layer.effect(
    AccountService, 
    Effect.gen(function* () {
        const gw = yield* StellarGateway; 

        return {
            getAccount: (address) => gw.getAccount(address),
        };
    })
);

type BenAccount = {
    address: string, 
}