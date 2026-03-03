/**
 * 钱包类型：智能合约钱包 vs 外部账户（EOA）
 */
export enum WalletType {
  EOA = 'eoa',
  SmartContract = 'smart_contract',
}

/**
 * 签名算法方案。secp256r1 对应 EIP-7951（Passkey 原生签名），
 * 需要在设置中启用后才会使用。
 */
export enum SigningScheme {
  Secp256k1 = 'secp256k1',
  Secp256r1 = 'secp256r1',
}

export const WALLET_TYPE_LABELS: Record<WalletType, string> = {
  [WalletType.EOA]: 'EOA 钱包',
  [WalletType.SmartContract]: '智能合约钱包',
}

export const SIGNING_SCHEME_LABELS: Record<SigningScheme, string> = {
  [SigningScheme.Secp256k1]: 'secp256k1',
  [SigningScheme.Secp256r1]: 'Passkey 原生签名 (secp256r1)',
}
