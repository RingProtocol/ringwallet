import { useBalance } from 'wagmi'

function BalanceComponent(walletAddress: Address, chainId: number) {
  const { data, isError, isLoading } = useBalance({
    address: walletAddress,//'0x05A3c00059B5ab677e4eD711b2c8cEE3AC22842d',
    chainId: chainId, // Sepolia的chainId
    watch: true, // 监听余额变化
  })

  if (isLoading) return <div>加载中...</div>
  if (isError) return <div>查询出错</div>

  // 确保data存在并且正确格式化
  return (
    <div>
      余额: {data?.formatted} {data?.symbol}
      <br />
      原始值(wei): {data?.value.toString()}
    </div>
  )
}
