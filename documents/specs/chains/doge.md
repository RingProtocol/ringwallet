@src/components/AccountDrawer.tsx:288-294 some testnet is diff from mainnet in address derivation.

# bitcoin

Because Solana does not require special handling. The core logic here is to retrieve the account list from accountsByFamily using family as the key:

typescript
let key: string = family ?? ChainFamily.EVM
Solana: family = 'solana' → key = 'solana' → accountsByFamily['solana'] — direct hit, no additional logic needed.

Bitcoin mainnet: family = 'bitcoin' → key = 'bitcoin' → correct.

Bitcoin testnet: requires special handling because Bitcoin testnet uses an independent derivation path (m/44'/1'/...), and it exists under accountsByFamily['bitcoin_testnet'] rather than accountsByFamily['bitcoin'].

Dogecoin testnet: similarly.

Only Bitcoin and Dogecoin have different derivation paths (different coin types) for mainnet vs testnet, which necessitates different keys. Solana devnet and mainnet share the same key scheme, so a single key 'solana' suffices.

# dogecoin vs dogechain

They are not duplicates—these are two completely different chains:

Dogecoin L1 (526-546) Dogechain (547-565)
Nature Dogecoin native UTXO chain (D‑addresses) EVM sidechain based on Polygon Edge
Family ChainFamily.Dogecoin ChainFamily.EVM
Chain ID 'dogecoin-mainnet' / 'dogecoin-testnet' 2000 / 568
Address format D... (P2PKH) 0x... (Ethereum format)
Consensus PoW (Scrypt) PoS (EVM compatible)
The names may be confusing, but Dogecoin ≠ Dogechain. Both need to be kept.
