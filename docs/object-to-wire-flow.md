# Step-by-Step
1. Native JS: Simple String
```
"GBC...WLDH" 
```

2. SDK Object: Adds Stellar logic
```js
Address.fromString(...) 
```

3. XDR Payload: Converts to Soroban's address format
```js
.toScAddress() 
```

4. XDR Envelope: Wraps it so the RPC can understand it
```js
xdr.ScVal.scvAddress(...)
```

5. Wire Format: Flattens it for the HTTP request
```js
.toXDR("base64")
```


# Flow
- Sending to RPC: Native -> SDK Object -> ScVal Envelope -> Base64

| native js    | sdk                  | xdr payload    | xdr envelope         | wire |
| ------------ | -------------------- | -------------- | -------------------- | ---- |
| "GBC...WLDH" | Address.fromString() | .toScAddress() | xdr.ScVal.scvAddress | .toXdr("base64") |


- Receiving from RPC: Base64 -> ScVal Envelope -> Native