import { Connection, Keypair, PublicKey, Transaction } from '@solana/web3.js'
import {
  getAssociatedTokenAddress,
  createTransferInstruction,
  createAssociatedTokenAccountInstruction,
  getAccount,
  getMint,
  TokenAccountNotFoundError,
} from '@solana/spl-token'

/** Approximate SOL cost to create a new Associated Token Account. */
export const ATA_CREATION_FEE_SOL = 0.00203928

export class SolanaTokenService {
  constructor(private connection: Connection) {}

  /**
   * Get the UI-formatted balance of an SPL token for an owner.
   * Returns '0' if the Associated Token Account does not exist yet.
   */
  async getTokenBalance(owner: string, mint: string): Promise<string> {
    const ownerPubkey = new PublicKey(owner)
    const mintPubkey = new PublicKey(mint)
    const ata = await getAssociatedTokenAddress(mintPubkey, ownerPubkey)
    try {
      const balance = await this.connection.getTokenAccountBalance(ata)
      return balance.value.uiAmountString ?? '0'
    } catch {
      return '0'
    }
  }

  /**
   * Check whether the recipient's Associated Token Account exists.
   * If not, the sender will need to pay ~0.002 SOL to create it.
   */
  async recipientNeedsATA(recipient: string, mint: string): Promise<boolean> {
    const ownerPubkey = new PublicKey(recipient)
    const mintPubkey = new PublicKey(mint)
    const ata = await getAssociatedTokenAddress(mintPubkey, ownerPubkey)
    try {
      await getAccount(this.connection, ata)
      return false
    } catch (err) {
      if (err instanceof TokenAccountNotFoundError) return true
      throw err
    }
  }

  /**
   * Fetch on-chain mint info (decimals) for an SPL token.
   */
  async getTokenMetadata(mint: string): Promise<{ decimals: number }> {
    const mintInfo = await getMint(this.connection, new PublicKey(mint))
    return { decimals: mintInfo.decimals }
  }

  /**
   * Transfer SPL tokens to a recipient.
   * Automatically creates the recipient's ATA if needed (sender pays the rent).
   * @param amount - Raw token amount in smallest unit (e.g. 1_000_000n = 1 USDC)
   */
  async sendToken(
    senderKeypair: Keypair,
    recipient: string,
    mint: string,
    amount: bigint
  ): Promise<string> {
    const mintPubkey = new PublicKey(mint)
    const recipientPubkey = new PublicKey(recipient)

    const senderATA = await getAssociatedTokenAddress(
      mintPubkey,
      senderKeypair.publicKey
    )
    const recipientATA = await getAssociatedTokenAddress(
      mintPubkey,
      recipientPubkey
    )

    const { blockhash, lastValidBlockHeight } =
      await this.connection.getLatestBlockhash('confirmed')

    const transaction = new Transaction({
      recentBlockhash: blockhash,
      feePayer: senderKeypair.publicKey,
    })

    // Create recipient ATA if it doesn't exist
    try {
      await getAccount(this.connection, recipientATA)
    } catch (err) {
      if (err instanceof TokenAccountNotFoundError) {
        transaction.add(
          createAssociatedTokenAccountInstruction(
            senderKeypair.publicKey, // payer
            recipientATA,
            recipientPubkey,
            mintPubkey
          )
        )
      } else {
        throw err
      }
    }

    transaction.add(
      createTransferInstruction(
        senderATA,
        recipientATA,
        senderKeypair.publicKey,
        amount
      )
    )

    const signature = await this.connection.sendTransaction(transaction, [
      senderKeypair,
    ])
    await this.connection.confirmTransaction(
      { signature, blockhash, lastValidBlockHeight },
      'confirmed'
    )

    return signature
  }
}
