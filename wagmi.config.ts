import { defineConfig } from '@wagmi/cli'
import { http } from 'viem'
import { sepolia, mainnet } from 'viem/chains'

//rpcurl=https://eth-sepolia.g.alchemy.com/v2/NOrtL9VcGcMtAVSWxGOt9
export default defineConfig({
  out: 'src/generated.ts',
  contracts: [],
  plugins: [],
})