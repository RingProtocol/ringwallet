import { readFileSync } from 'fs'
import { resolve } from 'path'

const dotenvPath = resolve(process.cwd(), '.env')
try {
  const content = readFileSync(dotenvPath, 'utf8')
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIndex = trimmed.indexOf('=')
    if (eqIndex < 0) continue
    const key = trimmed.slice(0, eqIndex)
    const val = trimmed.slice(eqIndex + 1).replace(/^["']|["']$/g, '')
    if (key.startsWith('VITE_')) {
      process.env[key] = val
    }
  }
} catch {}

/**
 * RPC and other VITE_* vars are inlined at build time via webpack DefinePlugin below.
 * On Vercel: add VITE_RPC_ETH_MAINNET etc. under Project → Environment Variables,
 * enable for Production (and Preview if needed), then redeploy — build must see them.
 * Alternatively set NEXT_PUBLIC_RPC_* ; they are mapped to VITE_* in the plugin.
 */
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['cbor-x'],
  allowedDevOrigins: ['bridget-tritheistical-talia.ngrok-free.dev'],
  turbopack: {},
  webpack: (config, { webpack }) => {
    // Build a single import.meta.env object so that accessing any VITE_*
    // key returns the value (or undefined for missing keys) instead of
    // crashing because import.meta.env itself is undefined in webpack.
    const viteEnv = {};
    for (const [key, value] of Object.entries(process.env)) {
      if (key.startsWith('VITE_')) {
        viteEnv[key] = value;
      } else if (key.startsWith('NEXT_PUBLIC_')) {
        const viteKey = key.replace('NEXT_PUBLIC_', 'VITE_');
        viteEnv[viteKey] = value;
      }
    }
    config.plugins.push(
      new webpack.DefinePlugin({
        'import.meta.env': JSON.stringify(viteEnv),
      })
    );

    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    };

    config.module.rules.push({
      test: /\.wasm$/,
      type: 'webassembly/async',
    });

    return config;
  },
};

export default nextConfig;
