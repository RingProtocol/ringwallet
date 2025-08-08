/** @type {import('next').NextConfig} */
const nextConfig = {
    webpack: (config) => {
        config.module.rules.push({
            test: /\.well-known\/webauthn$/,
            type: "asset/resource",
            generator: {
                filename: ".well-known/webauthn"
            }
        });
        return config;
    }
};

module.exports = nextConfig;
