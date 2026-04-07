import { Address, xdr } from "@stellar/stellar-sdk";

const mintFilter = (contractId: string) => ({
    type: "contract",
    contractIds: [contractId],
    // This matches: ["mint", <any address>, <any string>]
    topics: [
        [
            xdr.ScVal.scvSymbol("mint").toXDR("base64"),
            "*",
            "*",
        ],
    ],
});

const addressTopic = (address: string) =>
    xdr.ScVal.scvAddress(
        Address.fromString(address).toScAddress(),
    ).toXDR("base64");

const symbolToTopic = (name: string) =>
    xdr.ScVal.scvSymbol(
        name,
    ).toXDR("base64");

/*
CONTRACT EVENTS
{
  "ext": "v0",
  "contract_id": "CB23WRDQWGSP6YPMY4UV5C4OW5CBTXKYN3XEATG7KJEZCXMJBYEHOUOV",
  "type_": "contract",
  "body": {
    "v0": {
      "topics": [
        { "symbol": "mint" },
        { "address": "CAIPSKRXMYZRZZLCERWJ7MQNWTWLNHTCQBSNLPH4S46NE6LXKMBRQ2S4" },
        { "string": "KALE:GBDVX4VELCDSQ54KQJYTNHXAHFLBCA77ZY2USQBM4CSHTTV7DME7KALE" }
      ],
      "data": {
        "i128": "5744836"
      }
    }
  }
}
TRANSACTION EVENTS
{
  "stage": "before_all_txs",
  "event": {
    "ext": "v0",
    "contract_id": "CAS3J7GYLGXMF6TDJBBYYSE3HQ6BBSMLNUQ34T6TZMYMW2EVH34XOWMA",
    "type_": "contract",
    "body": {
      "v0": {
        "topics": [
          {
            "symbol": "fee"
          },
          {
            "address": "GA2JRQOF6EA3HQWDCEDBPPMLYPJCFLDDGYZLEQGMS5SOBQIB3BAFHVAW"
          }
        ],
        "data": {
          "i128": "21880"
        }
      }
    }
  }
}
  {
  "stage": "after_all_txs",
  "event": {
    "ext": "v0",
    "contract_id": "CAS3J7GYLGXMF6TDJBBYYSE3HQ6BBSMLNUQ34T6TZMYMW2EVH34XOWMA",
    "type_": "contract",
    "body": {
      "v0": {
        "topics": [
          {
            "symbol": "fee"
          },
          {
            "address": "GA2JRQOF6EA3HQWDCEDBPPMLYPJCFLDDGYZLEQGMS5SOBQIB3BAFHVAW"
          }
        ],
        "data": {
          "i128": "-9768"
        }
      }
    }
  }
}
*/
