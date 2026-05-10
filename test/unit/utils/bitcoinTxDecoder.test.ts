import { describe, it, expect } from 'vitest'
import { decodeBitcoinTx, buildBitcoinRows } from '@/utils/bitcoinTxDecoder'

describe('decodeBitcoinTx', () => {
  it('returns null for invalid hex', () => {
    expect(decodeBitcoinTx('not-a-hex', '', 0)).toBeNull()
    expect(decodeBitcoinTx('', '', 0)).toBeNull()
    expect(decodeBitcoinTx('0xdeadbeef', '', 0)).toBeNull()
  })
})

describe('buildBitcoinRows', () => {
  const mockT = (key: string) =>
    ({
      txFieldInputs: 'Inputs',
      txFieldTo: 'To',
      txFieldValue: 'Value',
      txFieldChange: 'Change',
      txFieldMinerFee: 'Miner Fee',
      txFieldFeeRate: 'Fee Rate',
      txFieldTxSize: 'TX Size',
    })[key] || key

  it('builds rows for a tx with recipient and change outputs', () => {
    const decoded = {
      inputCount: 2,
      outputs: [
        {
          address: 'tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx',
          valueBtc: '0.00050000',
          valueSats: 50000,
          isChange: false,
        },
        {
          address: 'tb1qsenderaddressfake00000000000000000000',
          valueBtc: '0.00010000',
          valueSats: 10000,
          isChange: true,
        },
      ],
      feeSats: 300,
      feeBtc: '0.00000300',
      vBytes: 141,
      feeRate: '2.1 sat/vB',
    }

    const rows = buildBitcoinRows(decoded, 'tBTC', mockT)
    expect(rows.length).toBeGreaterThan(0)

    const inputRow = rows.find((r) => r.label === 'Inputs')
    expect(inputRow).toBeTruthy()
    expect(inputRow!.value).toBe('2')

    const toRow = rows.find((r) => r.label === 'To')
    expect(toRow).toBeTruthy()
    expect(toRow!.mono).toBe(true)

    const valueRow = rows.find((r) => r.label === 'Value')
    expect(valueRow).toBeTruthy()
    expect(valueRow!.value).toBe('0.00050000 tBTC')

    const changeRow = rows.find((r) => r.label === 'Change')
    expect(changeRow).toBeTruthy()
    expect(changeRow!.value).toContain('tBTC')
    expect(changeRow!.indent).toBe(true)

    const feeRow = rows.find((r) => r.label === 'Miner Fee')
    expect(feeRow).toBeTruthy()
    expect(feeRow!.value).toContain('300 sats')
    expect(feeRow!.value).toContain('tBTC')

    const rateRow = rows.find((r) => r.label === 'Fee Rate')
    expect(rateRow!.value).toBe('2.1 sat/vB')

    const sizeRow = rows.find((r) => r.label === 'TX Size')
    expect(sizeRow!.value).toBe('141 vBytes')
  })

  it('builds rows for a tx without change', () => {
    const decoded = {
      inputCount: 1,
      outputs: [
        {
          address: 'tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx',
          valueBtc: '0.00100000',
          valueSats: 100000,
          isChange: false,
        },
      ],
      feeSats: 450,
      feeBtc: '0.00000450',
      vBytes: 110,
      feeRate: '4.1 sat/vB',
    }

    const rows = buildBitcoinRows(decoded, 'BTC', mockT)
    const changeRow = rows.find((r) => r.label === 'Change')
    expect(changeRow).toBeUndefined()

    const inputRow = rows.find((r) => r.label === 'Inputs')
    expect(inputRow!.value).toBe('1')
  })
})
