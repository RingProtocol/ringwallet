/** Same 32-byte seed as `src/services/chainplugins/registry.test.ts` */
export const KNOWN_MASTER_SEED = new Uint8Array(
  Buffer.from(
    'fffcf9f6f3f0edeae7e4e1dedbd8d5d2cfccc9c6c3c0bdbab7b4b1aeaba8a5a2',
    'hex'
  )
)

export const skipMultichainIntegration =
  process.env.SKIP_MULTICHAIN_INTEGRATION === '1'
