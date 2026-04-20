import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { spawn, type ChildProcess } from 'child_process'
import { fileURLToPath } from 'url'
import path from 'path'
import { execFileSync } from 'child_process'
import { BitcoinService } from '@/services/rpc/bitcoinService'
import { BitcoinKeyService } from '@/services/chainplugins/bitcoin/bitcoinPlugin'
import { KNOWN_MASTER_SEED } from './seed'

const runRegtest = process.env.RUN_BITCOIN_REGTEST === '1'

const indexerBase =
  process.env.TEST_BITCOIN_INDEXER_URL?.replace(/\/$/, '') ||
  'http://127.0.0.1:3002'

function dockerCli(args: string[]): string {
  return execFileSync(
    'docker',
    [
      'exec',
      'ring-bitcoind-regtest',
      'bitcoin-cli',
      '-regtest',
      '-rpcuser=ci',
      '-rpcpassword=cipass',
      ...args,
    ],
    { encoding: 'utf8' }
  ).trim()
}

function fundMinerWallet() {
  try {
    dockerCli(['createwallet', 'miner', 'false', 'false', '', 'false', 'true'])
  } catch {
    try {
      dockerCli(['loadwallet', 'miner'])
    } catch {
      /* exists */
    }
  }
  const minerAddr = dockerCli([
    '-rpcwallet=miner',
    'getnewaddress',
    'miner',
    'bech32',
  ])
  dockerCli(['-rpcwallet=miner', 'generatetoaddress', '110', minerAddr])

  const a0 = BitcoinKeyService.deriveAccountNode(KNOWN_MASTER_SEED, true, 0, {
    regtest: true,
  })
  const a1 = BitcoinKeyService.deriveAccountNode(KNOWN_MASTER_SEED, true, 1, {
    regtest: true,
  })

  dockerCli(['-rpcwallet=miner', 'sendtoaddress', a0.address, '12'])
  dockerCli(['-rpcwallet=miner', 'generatetoaddress', '1', minerAddr])

  return { a0, a1, minerAddr }
}

async function waitForEsplora(base: string) {
  const { setTimeout: delay } = await import('timers/promises')
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(`${base}/blocks/tip/height`)
      if (r.ok) return
    } catch {
      /* retry */
    }
    await delay(1000)
  }
  throw new Error(`Esplora proxy not reachable: ${base}`)
}

describe.skipIf(!runRegtest)(
  'multichain: Bitcoin regtest (transfer + balance)',
  () => {
    let proxy: ChildProcess | undefined
    const proxyScript = path.join(
      path.dirname(fileURLToPath(import.meta.url)),
      '../bitcoin-regtest/esplora-proxy.mjs'
    )

    beforeAll(async () => {
      proxy = spawn(process.execPath, [proxyScript], {
        stdio: ['ignore', 'pipe', 'pipe'],
        env: { ...process.env, ESPLORA_PROXY_PORT: '3002' },
        detached: false,
      })
      await waitForEsplora(indexerBase)
      fundMinerWallet()
    }, 120_000)

    afterAll(() => {
      proxy?.kill('SIGTERM')
    })

    it('builds, broadcasts P2WPKH tx and updates balances', async () => {
      const service = new BitcoinService(indexerBase, false, 'regtest')
      const a0 = BitcoinKeyService.deriveAccountNode(
        KNOWN_MASTER_SEED,
        true,
        0,
        {
          regtest: true,
        }
      )
      const a1 = BitcoinKeyService.deriveAccountNode(
        KNOWN_MASTER_SEED,
        true,
        1,
        {
          regtest: true,
        }
      )

      const bal0Before = await service.getBalance(a0.address)
      expect(bal0Before).toBeGreaterThan(0)

      const amountSats = 100_000
      const { txHex } = await service.buildAndSignTransaction({
        fromAddress: a0.address,
        toAddress: a1.address,
        amountSats,
        masterSeed: KNOWN_MASTER_SEED,
        addressIndex: 0,
        feeRate: 5,
      })

      const txid = await service.broadcast(txHex)
      expect(txid.length).toBeGreaterThan(10)

      const mineAddr = dockerCli([
        '-rpcwallet=miner',
        'getnewaddress',
        'm',
        'bech32',
      ])
      dockerCli(['-rpcwallet=miner', 'generatetoaddress', '1', mineAddr])

      const bal1 = await service.getBalance(a1.address)
      expect(bal1).toBeGreaterThan(0)

      const bal0After = await service.getBalance(a0.address)
      expect(bal0After).toBeLessThan(bal0Before)
    }, 120_000)
  }
)
