import React, { useState } from 'react'
import { ethers } from 'ethers'
import './ImportTokenDialog.css'

const ERC20_ABI = [
  'function symbol() view returns (string)',
  'function name() view returns (string)',
  'function decimals() view returns (uint8)',
] as const

export interface ImportedTokenInfo {
  symbol: string
  name: string
  address: string
  decimals: number
}

interface ImportTokenDialogProps {
  isOpen: boolean
  onClose: () => void
  onImport: (token: ImportedTokenInfo) => void
  rpcUrl?: string
}

const ImportTokenDialog: React.FC<ImportTokenDialogProps> = ({
  isOpen,
  onClose,
  onImport,
  rpcUrl,
}) => {
  const [address, setAddress] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleConfirm = async () => {
    if (!address.trim()) {
      setError('请输入代币合约地址')
      return
    }

    if (!ethers.isAddress(address.trim())) {
      setError('无效的地址格式')
      return
    }

    if (!rpcUrl) {
      setError('RPC 未配置')
      return
    }

    setError('')
    setIsLoading(true)

    try {
      const provider = new ethers.JsonRpcProvider(rpcUrl)
      const contract = new ethers.Contract(address.trim(), ERC20_ABI, provider)

      const [symbol, name, decimals] = await Promise.all([
        contract.symbol(),
        contract.name(),
        contract.decimals(),
      ])

      onImport({
        symbol: symbol || 'UNKNOWN',
        name: name || 'Unknown Token',
        address: address.trim(),
        decimals: Number(decimals),
      })
      setAddress('')
      onClose()
    } catch (e) {
      console.error('Failed to fetch token info:', e)
      setError('无法获取代币信息，请检查地址是否有效')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setAddress('')
    setError('')
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="import-token-overlay" onClick={handleClose}>
      <div className="import-token-dialog" onClick={(e) => e.stopPropagation()}>
        <h3>导入代币</h3>
        <div className="form-group">
          <label>代币合约地址</label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="0x..."
            className="input-field"
            disabled={isLoading}
          />
        </div>
        {error && <div className="import-token-error">{error}</div>}
        <div className="import-token-actions">
          <button
            onClick={handleConfirm}
            disabled={isLoading || !address.trim()}
            className="primary-btn"
          >
            {isLoading ? '导入中...' : '导入'}
          </button>
          <button onClick={handleClose} className="secondary-btn">
            取消
          </button>
        </div>
      </div>
    </div>
  )
}

export default ImportTokenDialog
