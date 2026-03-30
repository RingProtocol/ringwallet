1. Address Formats
   Chain Family Format Example
   EVM (Ethereum, BSC, Polygon, etc.) Hexadecimal, prefixed with 0x
   40 hex characters = 20 bytes 0x1a2B3c4D5e6F7a8B9c0D1e2F3a4B5c6D7e8F9a0B
   Tron Base58Check encoded, prefixed with T
   34 alphanumeric characters (no 0, O, I, l) TJYrWbM3Qx5sS7vqkT9aT7J2FnPqde4qLR
2. Underlying Data
   Both address types represent the same 20‑byte (160‑bit) public key hash.

EVM address = the 20‑byte value directly displayed as hex with 0x.

Tron address = the same 20‑byte value, but with a one‑byte prefix (0x41) added, then encoded with Base58Check.

3. Conversion Rules
   🔁 EVM Address → Tron Address
   Take the EVM address 0x1a2B...a0B.

Remove the 0x prefix → get the 20‑byte hex string 1a2B...a0B.

Prepend the Tron address byte 41 (hex) → 411a2B...a0B (21 bytes).

Perform Base58Check encoding on the 21‑byte value:

Double SHA‑256 hash, take first 4 bytes as checksum.

Concatenate the 21‑byte data + checksum.

Encode the result with Base58.

The result automatically starts with a T (because the leading 0x41 becomes T in Base58Check).

🔁 Tron Address → EVM Address
Take the Tron address, e.g., TJYrWb...qLR.

Base58Check decode it:

Verify and remove the 4‑byte checksum.

Obtain a 21‑byte result.

Remove the first byte (which is 0x41 for standard Tron addresses).

The remaining 20 bytes are the public key hash.

Prefix with 0x to get the EVM address.
