/**
 * Wallet type: smart account vs externally owned account (EOA)
 */
export enum WalletType {
  EOA = 'eoa',
  SmartContract = 'smart_contract',
}

/**
 * Signing scheme. secp256r1 corresponds to EIP-7951 (Passkey native signing),
 * and is only used when enabled.
 */
export enum SigningScheme {
  Secp256k1 = 'secp256k1',
  Secp256r1 = 'secp256r1',
}

export const WALLET_TYPE_LABELS: Record<WalletType, string> = {
  [WalletType.EOA]: 'EOA wallet',
  [WalletType.SmartContract]: 'Smart account',
}

export const SIGNING_SCHEME_LABELS: Record<SigningScheme, string> = {
  [SigningScheme.Secp256k1]: 'secp256k1',
  [SigningScheme.Secp256r1]: 'Passkey native signing (secp256r1)',
}
