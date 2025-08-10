const withPWA = require('@ducanh2912/next-pwa').default({
  dest: 'public',
  customWorkerDir: 'worker',

  webpack: (config) => {
    config.module.rules.push({
      test: /\.well-known\/webauthn$/,
      type: "asset/resource",
      generator: {
        filename: ".well-known/webauthn"
      }
    });
    return config;
  },
  async headers() {
    return [
      {
        source: '/.well-known/webauthn',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/json'
          }
        ],
      },
    ];
  },
});

module.exports = withPWA({});