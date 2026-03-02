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
    return config;
  },
};

export default nextConfig;
