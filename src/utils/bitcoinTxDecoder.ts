import * as bitcoin from 'bitcoinjs-lib'

const SATS_PER_BTC = 1e8

export interface BitcoinTxOutput {
  address: string
  valueBtc: string
  valueSats: number
  isChange: boolean
}

export interface DecodedBitcoinTx {
  inputCount: number
  outputs: BitcoinTxOutput[]
  feeSats: number
  feeBtc: string
  vBytes: number
  feeRate: string
}

function truncAddr(addr: string): string {
  if (!addr || addr.length < 14) return addr
  return `${addr.slice(0, 8)}...${addr.slice(-6)}`
}

/**
 * Decode a signed Bitcoin raw transaction hex into readable fields.
 * @param fromAddress - sender's address, used to tag change outputs
 * @param feePaid - actual fee in sats (from buildAndSignTransaction result)
 * @param network - bitcoinjs-lib network (mainnet/testnet)
 */
export function decodeBitcoinTx(
  txHex: string,
  fromAddress: string,
  feePaid: number,
  network: bitcoin.Network = bitcoin.networks.bitcoin
): DecodedBitcoinTx | null {
  try {
    const tx = bitcoin.Transaction.fromHex(txHex)

    const outputs: BitcoinTxOutput[] = tx.outs.map((out) => {
      let address: string
      try {
        address = bitcoin.address.fromOutputScript(out.script, network)
      } catch {
        address = '(Unknown script)'
      }
      const valueSats = Number(out.value)
      const valueBtc = (valueSats / SATS_PER_BTC).toFixed(8)
      return {
        address,
        valueBtc,
        valueSats,
        isChange: address === fromAddress,
      }
    })

    const vBytes = tx.virtualSize()
    const feeRate = vBytes > 0 ? `${(feePaid / vBytes).toFixed(1)} sat/vB` : '-'

    return {
      inputCount: tx.ins.length,
      outputs,
      feeSats: feePaid,
      feeBtc: (feePaid / SATS_PER_BTC).toFixed(8),
      vBytes,
      feeRate,
    }
  } catch {
    return null
  }
}

export function buildBitcoinRows(
  decoded: DecodedBitcoinTx,
  nativeSymbol: string,
  t: (key: string) => string
): { label: string; value: string; mono?: boolean; indent?: boolean }[] {
  const rows: {
    label: string
    value: string
    mono?: boolean
    indent?: boolean
  }[] = []

  rows.push({ label: t('txFieldInputs'), value: String(decoded.inputCount) })

  for (const out of decoded.outputs) {
    if (out.isChange) {
      rows.push({
        label: t('txFieldChange'),
        value: `${out.valueBtc} ${nativeSymbol}`,
        indent: true,
      })
      rows.push({
        label: '',
        value: truncAddr(out.address),
        mono: true,
        indent: true,
      })
    } else {
      rows.push({
        label: t('txFieldTo'),
        value: truncAddr(out.address),
        mono: true,
      })
      rows.push({
        label: t('txFieldValue'),
        value: `${out.valueBtc} ${nativeSymbol}`,
      })
    }
  }

  rows.push({
    label: t('txFieldMinerFee'),
    value: `${decoded.feeBtc} ${nativeSymbol} (${decoded.feeSats} sats)`,
  })
  rows.push({ label: t('txFieldFeeRate'), value: decoded.feeRate })
  rows.push({
    label: t('txFieldTxSize'),
    value: `${decoded.vBytes} vBytes`,
  })

  return rows
}
