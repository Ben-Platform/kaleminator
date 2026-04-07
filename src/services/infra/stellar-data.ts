export type SorobanValue = string | bigint | boolean | number;

// TODO: evaluate ContractData<T = unknown> then move on to Schema.decodeUnknown
export interface ContractDataItem<T = unknown> { // key-val, 
    readonly key: string; 
    readonly value: T;
}

// TODO key typeof xdr.ScVal, extend interface
export interface ContractData<T extends Record<string, ContractDataItem<unknown>>> {
    readonly ledger: number; // TODO: evaluate if needed, this means "valid-at"
    readonly items: T;
}


const makeContractDataItem = <T>(key: string, value: T): ContractDataItem<T> => ({
    key,
    value
});