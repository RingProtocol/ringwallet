/**
 * viem `Account` that delegates EVM transaction signing to the isolated
 * signing Worker via `signerBridge`.
 *
 * The Worker is the only place that holds the master seed and derives
 * private keys. The main thread (and this module) never see key material.
 *
 * Only `signTransaction` is implemented. That is the only method the
 * Lido stake flow needs (Lido SDK uses `writeContract` → `sendTransaction`
 * → viem calls `account.signTransaction`). `signMessage` and
 * `signTypedData` throw with a clear error if invoked — neither the
 * Earn flow nor any current consumer of the SDK uses them.
 */

import {
  formatEther,
  serializeTransaction,
  type Account,
  type Address,
  type Hex,
  type SerializeTransactionFn,
  type SignableMessage,
  type TransactionSerializable,
  type TypedDataDefinition,
} from 'viem'
import { signerBridge } from '../services/account/signerBridge'

export interface ViemSignerAccountOptions {
  address: Address
  /** HD account index (m/44'/60'/0'/0/<index>). */
  index: number
  chainId: number
  rpcUrl: string
}

export function createViemSignerAccount(
  opts: ViemSignerAccountOptions
): Account {
  const { address, index, chainId, rpcUrl } = opts

  // We expose the methods viem calls at writeContract / sendTransaction
  // time (signTransaction is required; signMessage/signTypedData are
  // implemented as throwing stubs for safety).
  //
  // viem's `Account` is a discriminated `OneOf<JsonRpcAccount | LocalAccount
  // | SmartAccount>`. `JsonRpcAccount` does not allow extra sign methods
  // (signMessage must be undefined), and `LocalAccount` requires a
  // `publicKey` that we deliberately do not have on the main thread (the
  // key lives only in the Worker). The runtime only needs `signTransaction`
  // for our flow, so we cast to `Account` and let viem dispatch on the
  // `type` field.
  return {
    address,
    type: 'json-rpc',

    // Not used by Earn; throw with a descriptive error if a future caller
    // tries to sign arbitrary messages. We never want to silently fall
    // back to something that would expose the key in the main thread.
    async signMessage(
      _args: { message: SignableMessage } | unknown
    ): Promise<Hex> {
      void _args
      throw new Error(
        'ViemSignerAccount.signMessage is not supported; use an on-chain flow'
      )
    },

    async signTransaction(
      transaction: TransactionSerializable,
      options?: { serializer?: SerializeTransactionFn }
    ): Promise<Hex> {
      // `options.serializer` is the viem serializer for the transaction
      // shape. The Worker builds and signs the transaction itself using
      // its own RLP encoder, so we don't need to call it — but we keep
      // the parameter so the type signature matches viem's Account.
      void (options?.serializer ?? serializeTransaction)

      // The Worker's signEvm takes the value in ETH (not wei), and
      // re-encodes the transaction with the live nonce, fees, and
      // gas estimate fetched from `rpcUrl`. viem may or may not have
      // pre-filled nonce/gas; both are accepted.
      const valueWei = (transaction as { value?: bigint }).value ?? 0n
      const data = (transaction as { data?: Hex }).data
      const gas = (transaction as { gas?: bigint }).gas

      const rawTx = await signerBridge.signEvm({
        index,
        to: (transaction.to ?? '') as string,
        amount: formatEther(valueWei),
        chainId,
        rpcUrl,
        data: data as string | undefined,
        gasLimit: gas?.toString(),
      })
      return rawTx as Hex
    },

    async signTypedData(
      _typedData: TypedDataDefinition | unknown
    ): Promise<Hex> {
      void _typedData
      throw new Error(
        'ViemSignerAccount.signTypedData is not supported; use an on-chain flow'
      )
    },
  } as unknown as Account
}
