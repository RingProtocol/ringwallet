import { defineConfig } from '@wagmi/cli'
import { http } from 'viem'
import { sepolia, ethereum } from 'viem/chains'

//rpcurl=https://eth-sepolia.g.alchemy.com/v2/NOrtL9VcGcMtAVSWxGOt9
export default defineConfig({
  out: 'src/generated.ts',
  contracts: [],
  plugins: [],
  chains: [sepolia, ethereum],
  transports: {
    [sepolia.id]: http('https://eth-sepolia.g.alchemy.com/v2/NOrtL9VcGcMtAVSWxGOt9'),
  },
})
