import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js'

export class SolanaService {
  private connection: Connection

  constructor(rpcUrl: string) {
    this.connection = new Connection(rpcUrl, 'confirmed')
  }

  getConnection(): Connection {
    return this.connection
  }

  /** SOL balance in SOL units (not lamports). Returns 0 for brand-new addresses. */
  async getBalance(address: string): Promise<number> {
    const pubkey = new PublicKey(address)
    const lamports = await this.connection.getBalance(pubkey)
    return lamports / LAMPORTS_PER_SOL
  }

  /**
   * Estimate the transaction fee for a simple SOL transfer.
   * Falls back to the network minimum (5000 lamports) on error.
   */
  async estimateFee(
    senderPubkey: PublicKey,
    recipient: string,
    amountSOL: number
  ): Promise<number> {
    try {
      const { blockhash } =
        await this.connection.getLatestBlockhash('confirmed')
      const tx = new Transaction({
        recentBlockhash: blockhash,
        feePayer: senderPubkey,
      }).add(
        SystemProgram.transfer({
          fromPubkey: senderPubkey,
          toPubkey: new PublicKey(recipient),
          lamports: Math.round(amountSOL * LAMPORTS_PER_SOL),
        })
      )
      const fee = await tx.getEstimatedFee(this.connection)
      return (fee ?? 5000) / LAMPORTS_PER_SOL
    } catch {
      return 5000 / LAMPORTS_PER_SOL
    }
  }

  /** Build, sign, and return the serialized transaction without broadcasting. */
  async buildAndSignSOL(
    senderKeypair: Keypair,
    recipient: string,
    amountSOL: number
  ): Promise<{
    serializedTx: Buffer
    blockhash: string
    lastValidBlockHeight: number
  }> {
    const { blockhash, lastValidBlockHeight } =
      await this.connection.getLatestBlockhash('confirmed')

    const lamports = Math.round(amountSOL * LAMPORTS_PER_SOL)
    const transaction = new Transaction({
      recentBlockhash: blockhash,
      feePayer: senderKeypair.publicKey,
    }).add(
      SystemProgram.transfer({
        fromPubkey: senderKeypair.publicKey,
        toPubkey: new PublicKey(recipient),
        lamports,
      })
    )

    transaction.sign(senderKeypair)
    const serializedTx = transaction.serialize()

    return {
      serializedTx: Buffer.from(serializedTx),
      blockhash,
      lastValidBlockHeight,
    }
  }

  /** Broadcast a pre-signed serialized transaction. Returns the signature. */
  async broadcastRawTransaction(
    serializedTx: Buffer,
    blockhash: string,
    lastValidBlockHeight: number
  ): Promise<string> {
    const signature = await this.connection.sendRawTransaction(serializedTx, {
      skipPreflight: false,
      preflightCommitment: 'confirmed',
    })

    const result = await this.connection.confirmTransaction(
      { signature, blockhash, lastValidBlockHeight },
      'confirmed'
    )

    if (result.value.err) {
      throw new Error(`Transaction failed: ${JSON.stringify(result.value.err)}`)
    }

    return signature
  }

  /** Send SOL. Returns the transaction signature (Base58). */
  async sendSOL(
    senderKeypair: Keypair,
    recipient: string,
    amountSOL: number
  ): Promise<string> {
    const { serializedTx, blockhash, lastValidBlockHeight } =
      await this.buildAndSignSOL(senderKeypair, recipient, amountSOL)
    return this.broadcastRawTransaction(
      serializedTx,
      blockhash,
      lastValidBlockHeight
    )
  }

  /** Request an airdrop on devnet/testnet. Not available on mainnet. */
  async requestAirdrop(address: string, solAmount = 1): Promise<void> {
    const sig = await this.connection.requestAirdrop(
      new PublicKey(address),
      solAmount * LAMPORTS_PER_SOL
    )
    const { blockhash, lastValidBlockHeight } =
      await this.connection.getLatestBlockhash()
    await this.connection.confirmTransaction(
      { signature: sig, blockhash, lastValidBlockHeight },
      'confirmed'
    )
  }
}
