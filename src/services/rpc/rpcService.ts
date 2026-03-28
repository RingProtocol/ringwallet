import { ChainFamily, type Chain } from '../../models/ChainType';
import EvmRpcService from './evmRpcService';

type RpcChainLike = Pick<Chain, 'family' | 'rpcUrl'> | null | undefined;

export class RpcService {
  private static readonly instances = new Map<string, RpcService>()
  private evmService: EvmRpcService | null = null

  constructor(private readonly chain: RpcChainLike) {}

  static fromChain(chain: RpcChainLike): RpcService {
    const key = RpcService.buildCacheKey(chain)
    const cached = RpcService.instances.get(key)
    if (cached) {
      return cached
    }

    const service = new RpcService(chain)
    RpcService.instances.set(key, service)
    return service
  }

  private static buildCacheKey(chain: RpcChainLike): string {
    const family = chain?.family ?? 'unknown'
    const rpcUrls = chain?.rpcUrl?.filter(Boolean).join('|') ?? ''
    return `${String(family)}::${rpcUrls}`
  }

  getEvmService(): EvmRpcService {
    if (this.chain?.family && this.chain.family !== ChainFamily.EVM) {
      throw new Error(`RPC service for ${String(this.chain.family)} is not implemented`);
    }

    const rpcUrls = this.chain?.rpcUrl?.filter(Boolean) ?? []
    if (rpcUrls.length === 0) {
      throw new Error('RPC URL is required');
    }

    if (!this.evmService) {
      this.evmService = new EvmRpcService(rpcUrls)
    }

    return this.evmService
  }
}

export default RpcService;
