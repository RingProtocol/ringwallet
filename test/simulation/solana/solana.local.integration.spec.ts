import { describe, it, expect, beforeAll } from 'vitest'
import { SolanaService } from '@/services/rpc/solanaService'
import { SolanaKeyService } from '@/services/chainplugins/solana/solanaPlugin'
import { KNOWN_MASTER_SEED } from '../seed'

const runLocal =
  process.env.SOLANA_LOCAL_TEST === '1' ||
  process.env.TEST_SOLANA_RPC_URL?.includes('127.0.0.1')

const rpcUrl =
  process.env.TEST_SOLANA_RPC_URL?.trim() || 'http://127.0.0.1:8899'

describe.skipIf(!runLocal)(
  'multichain: Solana local validator (transfer + balance)',
  () => {
    let service: SolanaService

    beforeAll(() => {
      service = new SolanaService(rpcUrl)
    })

    it('airdrops, sends SOL between derived accounts, and reads balances', async () => {
      const sender = SolanaKeyService.deriveKeypair(KNOWN_MASTER_SEED, 0)
      const recipient = SolanaKeyService.deriveKeypair(KNOWN_MASTER_SEED, 1)
      const from = sender.publicKey.toBase58()
      const to = recipient.publicKey.toBase58()

      await service.requestAirdrop(from, 2)

      const beforeTo = await service.getBalance(to)
      expect(beforeTo).toBeGreaterThanOrEqual(0)

      await service.sendSOL(sender, to, 0.05)

      const afterTo = await service.getBalance(to)
      expect(afterTo).toBeGreaterThan(beforeTo)

      const afterFrom = await service.getBalance(from)
      expect(afterFrom).toBeGreaterThanOrEqual(0)
    })
  }
)
