import { Brand } from "effect";

export type PailId = number & Brand.Brand<"PailId">

export const PailId = Brand.refined<PailId>(
    n => n > 0, 
    n => Brand.error(`Expected positive number, got ${n}`)
);

export type PailList = ReadonlyArray<PailId>;

export interface Pail {
    readonly blockId: PailId, 
    readonly owner: string,
    readonly zeros: number | null;
    readonly sequence: number;
};

export interface HarvestablePail extends Pail {
    readonly gap: number;
}

export interface HarvestedPail extends Pail {
    readonly amount: number;
}

