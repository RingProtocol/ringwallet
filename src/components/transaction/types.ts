import type { EIP7951Result } from '../../services/walletService';
import type { TokenInfo } from '../../utils/tokenStorage';

export type SignedTx = string | EIP7951Result;

export type SendTokenOption =
  | { type: 'native'; symbol: string }
  | { type: 'erc20'; token: TokenInfo };
