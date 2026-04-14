# request parameter

curl --request POST \
 --url https://rw.testring.org/v1/account_assets \
 --header 'Content-Type: application/json' \
 --data '{
"addresses": [
{
"address": "0xeb85b790FDe7B923916e659cF04f518fFc8c6CF4",
"networks": [
"eth-mainnet",
"eth-sepolia",
"base-mainnet",
"bnb-mainnet"
]
}
]
}'

# response

{
"data": {
"tokens": [
{
"address": "0xeb85b790fde7b923916e659cf04f518ffc8c6cf4",
"network": "eth-mainnet",
"tokenAddress": null,
"tokenBalance": "0x000000000000000000000000000000000000000000000000010a741f22666d40",
"tokenMetadata": {
"symbol": null,
"decimals": null,
"name": null,
"logo": null
},
"tokenPrices": [
{
"currency": "usd",
"value": "2385.0259039831",
"lastUpdatedAt": "2026-04-14T10:15:39Z"
}
]
},
{
"address": "0xeb85b790fde7b923916e659cf04f518ffc8c6cf4",
"network": "eth-sepolia",
"tokenAddress": null,
"tokenBalance": "0x0000000000000000000000000000000000000000000000019510ff9a57d473bc",
"tokenMetadata": {
"symbol": null,
"decimals": null,
"name": null,
"logo": null
},
"tokenPrices": []
},
{
"address": "0xeb85b790fde7b923916e659cf04f518ffc8c6cf4",
"network": "base-mainnet",
"tokenAddress": null,
"tokenBalance": "0x000000000000000000000000000000000000000000000000001132b6ac7395d7",
"tokenMetadata": {
"symbol": null,
"decimals": null,
"name": null,
"logo": null
},
"tokenPrices": [
{
"currency": "usd",
"value": "2385.0259039831",
"lastUpdatedAt": "2026-04-14T10:15:39Z"
}
]
},
{
"address": "0xeb85b790fde7b923916e659cf04f518ffc8c6cf4",
"network": "bnb-mainnet",
"tokenAddress": null,
"tokenBalance": "0x0000000000000000000000000000000000000000000000000000000000000000",
"tokenMetadata": {
"symbol": null,
"decimals": null,
"name": null,
"logo": null
},
"tokenPrices": [
{
"currency": "usd",
"value": "618.753019912",
"lastUpdatedAt": "2026-04-14T10:15:43Z"
}
]
},
{
"address": "0xeb85b790fde7b923916e659cf04f518ffc8c6cf4",
"network": "eth-mainnet",
"tokenAddress": "0x00e2b6d170740c15bf9fb01d0b6e77c0d4510e32",
"tokenBalance": "0x0000000000000000000000000000000000000000000000000de0b6b3a7640000",
"tokenMetadata": {
"decimals": 18,
"logo": null,
"name": "Royal Dog",
"symbol": "DOG"
},
"tokenPrices": []
},
{
"address": "0xeb85b790fde7b923916e659cf04f518ffc8c6cf4",
"network": "eth-mainnet",
"tokenAddress": "0x059b2051bc369a52dfa4bcbaa77388483279320c",
"tokenBalance": "0x0000000000000000000000000000000000000000000000004563918244f40000",
"tokenMetadata": {
"decimals": 18,
"logo": null,
"name": "UniLife",
"symbol": "UniLife"
},
"tokenPrices": []
},
{
"address": "0xeb85b790fde7b923916e659cf04f518ffc8c6cf4",
"network": "eth-sepolia",
"tokenAddress": "0x059cf7a18a204dd707a26b3b7b018a50c9ad0ee3",
"tokenBalance": "0x0000000000000000000000000000000000000000033984867256dda709b7f1eb",
"tokenMetadata": {
"decimals": 18,
"logo": null,
"name": "eth_v4",
"symbol": "ETH_V4"
},
"tokenPrices": []
},
{
"address": "0xeb85b790fde7b923916e659cf04f518ffc8c6cf4",
"network": "eth-mainnet",
"tokenAddress": "0x05d26df93ba55a8e9e60693291213a5a835764bb",
"tokenBalance": "0x0000000000000000000000000000000000000000000000004563918244f40000",
"tokenMetadata": {
"decimals": 18,
"logo": null,
"name": "POWER",
"symbol": "POWER"
},
"tokenPrices": []
},
{
"address": "0xeb85b790fde7b923916e659cf04f518ffc8c6cf4",
"network": "base-mainnet",
"tokenAddress": "0x06088387eadce2ca0e8ce940c74f1c8939fbbcf5",
"tokenBalance": "0x0000000000000000000000000000000000000000000000000000000000000000",
"tokenMetadata": {
"decimals": 8,
"logo": null,
"name": "Peace",
"symbol": "Peace"
},
"tokenPrices": []
},
{
"address": "0xeb85b790fde7b923916e659cf04f518ffc8c6cf4",
"network": "base-mainnet",
"tokenAddress": "0x07d15798a67253d76cea61f0ea6f57aedc59dffb",
"tokenBalance": "0x00000000000000000000000000000000000000000000002a1f0a87470e840000",
"tokenMetadata": {
"decimals": 18,
"logo": null,
"name": "Based Coin",
"symbol": "BASED"
},
"tokenPrices": [
{
"currency": "usd",
"value": "0.0000050593",
"lastUpdatedAt": "2026-04-14T10:09:54Z"
}
]
},
{
"address": "0xeb85b790fde7b923916e659cf04f518ffc8c6cf4",
"network": "base-mainnet",
"tokenAddress": "0x091b1dbbdd959d7553ba817150ed59fb24c3eac9",
"tokenBalance": "0x0000000000000000000000000000000000000000000000000000000000000000",
"tokenMetadata": {
"decimals": 8,
"logo": null,
"name": "PEACE",
"symbol": "PEACE"
},
"tokenPrices": []
},
{
"address": "0xeb85b790fde7b923916e659cf04f518ffc8c6cf4",
"network": "eth-sepolia",
"tokenAddress": "0x0a0924581d9dbab51a0ad15943bcb377579ff457",
"tokenBalance": "0x00000000000000000000000000000000000000000000d3c21bcecceda0fffc18",
"tokenMetadata": {
"decimals": 18,
"logo": null,
"name": "Ring V2",
"symbol": "RING-V2"
},
"tokenPrices": []
},
{
"address": "0xeb85b790fde7b923916e659cf04f518ffc8c6cf4",
"network": "base-mainnet",
"tokenAddress": "0x0d4522191e02c5b17cf2d7e1de4c340e773b5fd6",
"tokenBalance": "0x00000000000000000000000000000000000000000000000053444835ec580000",
"tokenMetadata": {
"decimals": 18,
"logo": null,
"name": "FOFAR",
"symbol": "FOFAR"
},
"tokenPrices": []
},
{
"address": "0xeb85b790fde7b923916e659cf04f518ffc8c6cf4",
"network": "eth-mainnet",
"tokenAddress": "0x0dcc2fc508cc9ba1e7870d69536da6af07fc9aec",
"tokenBalance": "0x00000000000000000000000000000000000000000000038ebd2aa8e524c40000",
"tokenMetadata": {
"decimals": 18,
"logo": null,
"name": "WLFIV COM",
"symbol": "WLFIV COM"
},
"tokenPrices": []
},
{
"address": "0xeb85b790fde7b923916e659cf04f518ffc8c6cf4",
"network": "eth-mainnet",
"tokenAddress": "0x0f49943d89e7417522107f6e824c30aad487e6c0",
"tokenBalance": "0x0000000000000000000000000000000000000000000000000000000000000000",
"tokenMetadata": {
"decimals": 18,
"logo": null,
"name": "Padre Spurdo",
"symbol": "SP"
},
"tokenPrices": []
},
{
"address": "0xeb85b790fde7b923916e659cf04f518ffc8c6cf4",
"network": "eth-sepolia",
"tokenAddress": "0x134297b50c9c6b462d08f960762a00e7dde25bc0",
"tokenBalance": "0x0000000000000000000000000000000000000000000e0fe3d8bb9bc7b16f201b",
"tokenMetadata": {
"decimals": 18,
"logo": null,
"name": "Few Wrapped 4uv3b",
"symbol": "fw4UV3B"
},
"tokenPrices": []
},
{
"address": "0xeb85b790fde7b923916e659cf04f518ffc8c6cf4",
"network": "eth-sepolia",
"tokenAddress": "0x13703b2af61825ba86a95b5ae17a050b5c621545",
"tokenBalance": "0x000000000000000000000000000000000000000000075ca5f77d530fb2ef201b",
"tokenMetadata": {
"decimals": 18,
"logo": null,
"name": "Few Wrapped uv4b",
"symbol": "fwUV4B"
},
"tokenPrices": []
},
{
"address": "0xeb85b790fde7b923916e659cf04f518ffc8c6cf4",
"network": "eth-sepolia",
"tokenAddress": "0x156e9c6c0c005d0f7c5a350a6cdf57dabbffa78c",
"tokenBalance": "0x00000000000000000000000000000000000000000000003635c9adc5de9ffc18",
"tokenMetadata": {
"decimals": 18,
"logo": null,
"name": "Ring V2",
"symbol": "RING-V2"
},
"tokenPrices": []
},
{
"address": "0xeb85b790fde7b923916e659cf04f518ffc8c6cf4",
"network": "eth-sepolia",
"tokenAddress": "0x158eabe1e3bc8a741d1da12f16161a43265d1c41",
"tokenBalance": "0x00000000000000000000000000000000000000000329cf1a221002f8d4600000",
"tokenMetadata": {
"decimals": 18,
"logo": null,
"name": "uv4a",
"symbol": "UV4A"
},
"tokenPrices": []
},
{
"address": "0xeb85b790fde7b923916e659cf04f518ffc8c6cf4",
"network": "base-mainnet",
"tokenAddress": "0x15d8907f33b669c52533c0671248017a4930762b",
"tokenBalance": "0x0000000000000000000000000000000000000000000000000000000000000001",
"tokenMetadata": {
"decimals": 0,
"logo": null,
"name": "✅$UЅDС TOKEN DISTRIBUTION",
          "symbol": "UЅDС  | t.me/s/USCIRCLE | *claim until 12.06.25"
        },
        "tokenPrices": []
      },
      {
        "address": "0xeb85b790fde7b923916e659cf04f518ffc8c6cf4",
        "network": "eth-sepolia",
        "tokenAddress": "0x16d31cd3336be9da6718b221ef4292286bea4547",
        "tokenBalance": "0x00000000000000000000000000000000000000000000d3c21bcecceda0fffc18",
        "tokenMetadata": {
          "decimals": 18,
          "logo": null,
          "name": "Ring V2",
          "symbol": "RING-V2"
        },
        "tokenPrices": []
      },
      {
        "address": "0xeb85b790fde7b923916e659cf04f518ffc8c6cf4",
        "network": "eth-sepolia",
        "tokenAddress": "0x1710dd157ead1a066c7b3b76116a974aec223d15",
        "tokenBalance": "0x000000000000000000000000000000000000000003225fd1ad3ef3e49ae00000",
        "tokenMetadata": {
          "decimals": 18,
          "logo": null,
          "name": "uv3b",
          "symbol": "UV3B"
        },
        "tokenPrices": []
      },
      {
        "address": "0xeb85b790fde7b923916e659cf04f518ffc8c6cf4",
        "network": "bnb-mainnet",
        "tokenAddress": "0x18d0e455b3491e09210292d3953157a4bf104444",
        "tokenBalance": "0x00000000000000000000000000000000000000000000000000670d28388fd200",
        "tokenMetadata": {
          "decimals": 18,
          "logo": null,
          "name": "比特币",
          "symbol": "比特币"
        },
        "tokenPrices": []
      },
      {
        "address": "0xeb85b790fde7b923916e659cf04f518ffc8c6cf4",
        "network": "eth-sepolia",
        "tokenAddress": "0x1c7d4b196cb0c7b01d743fbc6116a902379c7238",
        "tokenBalance": "0x0000000000000000000000000000000000000000000000000000000001312d00",
        "tokenMetadata": {
          "decimals": 6,
          "logo": null,
          "name": "USDC",
          "symbol": "USDC"
        },
        "tokenPrices": []
      },
      {
        "address": "0xeb85b790fde7b923916e659cf04f518ffc8c6cf4",
        "network": "eth-sepolia",
        "tokenAddress": "0x1d8d18a57758fcc0f6d7d8859b58846cd7d50529",
        "tokenBalance": "0x000000000000000000000000000000000000000000000001b6daabc64ae591bf",
        "tokenMetadata": {
          "decimals": 18,
          "logo": null,
          "name": "Ring V2",
          "symbol": "RING-V2"
        },
        "tokenPrices": []
      },
      {
        "address": "0xeb85b790fde7b923916e659cf04f518ffc8c6cf4",
        "network": "base-mainnet",
        "tokenAddress": "0x1f237c797ceb3cb06ede8410874af1bef185500c",
        "tokenBalance": "0x00000000000000000000000000000000000000000000000029a2241af62c0000",
        "tokenMetadata": {
          "decimals": 18,
          "logo": null,
          "name": "Base2.0",
          "symbol": "Base2.0"
        },
        "tokenPrices": []
      },
      {
        "address": "0xeb85b790fde7b923916e659cf04f518ffc8c6cf4",
        "network": "eth-mainnet",
        "tokenAddress": "0x1f9840a85d5af5bf1d1762f925bdaddc4201f984",
        "tokenBalance": "0x00000000000000000000000000000000000000000000002b59f1d3ae1322a72c",
        "tokenMetadata": {
          "decimals": 18,
          "logo": "https://static.alchemyapi.io/images/assets/7083.png",
          "name": "Uniswap",
          "symbol": "UNI"
        },
        "tokenPrices": [
          {
            "currency": "usd",
            "value": "3.1966366766",
            "lastUpdatedAt": "2026-04-14T10:15:23Z"
          }
        ]
      },
      {
        "address": "0xeb85b790fde7b923916e659cf04f518ffc8c6cf4",
        "network": "eth-mainnet",
        "tokenAddress": "0x1fb5eaa93251fd014773dc66dd740bdb2637379d",
        "tokenBalance": "0x0000000000000000000000000000000000000000000000000000000000000000",
        "tokenMetadata": {
          "decimals": 18,
          "logo": null,
          "name": "Trump Gone",
          "symbol": "GONE"
        },
        "tokenPrices": []
      },
      {
        "address": "0xeb85b790fde7b923916e659cf04f518ffc8c6cf4",
        "network": "eth-mainnet",
        "tokenAddress": "0x1ff22cb1c7804b3529a005ddcf9bde6e7c9d6d90",
        "tokenBalance": "0x000000000000000000000000000000000000000000000000000000012a05f200",
        "tokenMetadata": {
          "decimals": 9,
          "logo": null,
          "name": "Flying Tulip",
          "symbol": "FT"
        },
        "tokenPrices": []
      },
      {
        "address": "0xeb85b790fde7b923916e659cf04f518ffc8c6cf4",
        "network": "eth-mainnet",
        "tokenAddress": "0x209fae5dd8cd466750ae9ac0acc7cbb9aff64ea8",
        "tokenBalance": "0x000000000000000000000000000000000000000000000000257853b1dd8e0000",
        "tokenMetadata": {
          "decimals": 18,
          "logo": null,
          "name": "Visit website getether .net to claim rewards",
          "symbol": "Visit website getether .net to claim rewards"
        },
        "tokenPrices": []
      },
      {
        "address": "0xeb85b790fde7b923916e659cf04f518ffc8c6cf4",
        "network": "eth-sepolia",
        "tokenAddress": "0x2233f161997f9f582e2e9665b537712718f48daa",
        "tokenBalance": "0x00000000000000000000000000000000000000000301020c3a192947b7e9c0ab",
        "tokenMetadata": {
          "decimals": 18,
          "logo": null,
          "name": "v2v3v4a",
          "symbol": "V2V3V4A"
        },
        "tokenPrices": []
      },
      {
        "address": "0xeb85b790fde7b923916e659cf04f518ffc8c6cf4",
        "network": "eth-sepolia",
        "tokenAddress": "0x225c1d174b8bc14b6f1d0206dad2d43aa6365326",
        "tokenBalance": "0x00000000000000000000000000000000000000000000108b2a2c28029093fff9",
        "tokenMetadata": {
          "decimals": 18,
          "logo": null,
          "name": "Ring V2",
          "symbol": "RING-V2"
        },
        "tokenPrices": []
      },
      {
        "address": "0xeb85b790fde7b923916e659cf04f518ffc8c6cf4",
        "network": "eth-mainnet",
        "tokenAddress": "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599",
        "tokenBalance": "0x00000000000000000000000000000000000000000000000000000000000057e9",
        "tokenMetadata": {
          "decimals": 8,
          "logo": "https://static.alchemyapi.io/images/assets/3717.png",
          "name": "Wrapped Bitcoin",
          "symbol": "WBTC"
        },
        "tokenPrices": [
          {
            "currency": "usd",
            "value": "74460.9308724608",
            "lastUpdatedAt": "2026-04-14T10:15:28Z"
          }
        ]
      },
      {
        "address": "0xeb85b790fde7b923916e659cf04f518ffc8c6cf4",
        "network": "eth-sepolia",
        "tokenAddress": "0x26ad6fbd9d8a2551e2f8f8d98e2a20c1cbcaac78",
        "tokenBalance": "0x000000000000000000000000000000000000000003214a34396e0b9585800001",
        "tokenMetadata": {
          "decimals": 18,
          "logo": null,
          "name": "v2v3",
          "symbol": "V2V3"
        },
        "tokenPrices": []
      },
      {
        "address": "0xeb85b790fde7b923916e659cf04f518ffc8c6cf4",
        "network": "eth-mainnet",
        "tokenAddress": "0x26ca7aefbc73cb20364df9bba4fdf642c52a60e4",
        "tokenBalance": "0x0000000000000000000000000000000000000000000000004563918244f40000",
        "tokenMetadata": {
          "decimals": null,
          "logo": null,
          "name": "",
          "symbol": ""
        },
        "tokenPrices": []
      },
      {
        "address": "0xeb85b790fde7b923916e659cf04f518ffc8c6cf4",
        "network": "eth-sepolia",
        "tokenAddress": "0x26f43b2b9b1c45bc6635b1720761b4ae95298d52",
        "tokenBalance": "0x000000000000000000000000000000000000000000314a33c28e7f765097cb81",
        "tokenMetadata": {
          "decimals": 18,
          "logo": null,
          "name": "fewv3v3b",
          "symbol": "FEWV2V3B"
        },
        "tokenPrices": []
      },
      {
        "address": "0xeb85b790fde7b923916e659cf04f518ffc8c6cf4",
        "network": "eth-sepolia",
        "tokenAddress": "0x277c85afd9dcb35c4e8b87f656eede3e77c47ffb",
        "tokenBalance": "0x0000000000000000000000000000000000000000033ae60aaf0a6233856b5c0f",
        "tokenMetadata": {
          "symbol": null,
          "decimals": null,
          "name": null,
          "logo": null
        },
        "tokenPrices": []
      },
      {
        "address": "0xeb85b790fde7b923916e659cf04f518ffc8c6cf4",
        "network": "eth-mainnet",
        "tokenAddress": "0x289f8baab9f7587214377744bcaaeb6021accf95",
        "tokenBalance": "0x0000000000000000000000000000000000000000000000000000000000000000",
        "tokenMetadata": {
          "decimals": 18,
          "logo": null,
          "name": "Disco Kendu",
          "symbol": "DOK"
        },
        "tokenPrices": []
      },
      {
        "address": "0xeb85b790fde7b923916e659cf04f518ffc8c6cf4",
        "network": "eth-sepolia",
        "tokenAddress": "0x28db927472cfec84ef14a45474cd51ac0419edda",
        "tokenBalance": "0x00000000000000000000000000000000000000000331d7529852725589d436c7",
        "tokenMetadata": {
          "decimals": 18,
          "logo": null,
          "name": "uv2b",
          "symbol": "UV2B"
        },
        "tokenPrices": []
      },
      {
        "address": "0xeb85b790fde7b923916e659cf04f518ffc8c6cf4",
        "network": "eth-sepolia",
        "tokenAddress": "0x28df00c5b25e2940c261b785194546b6f0c8fd82",
        "tokenBalance": "0x0000000000000000000000000000000000000000000020f022d009f3e73741e9",
        "tokenMetadata": {
          "decimals": 18,
          "logo": null,
          "name": "Uniswap V2",
          "symbol": "UNI-V2"
        },
        "tokenPrices": []
      },
      {
        "address": "0xeb85b790fde7b923916e659cf04f518ffc8c6cf4",
        "network": "eth-sepolia",
        "tokenAddress": "0x29f070e7689e3246b494e55322f3a3004e9bea99",
        "tokenBalance": "0x00000000000000000000000000000000000000000000003b16c9e8eeb7c80000",
        "tokenMetadata": {
          "decimals": 18,
          "logo": null,
          "name": "Few Wrapped S2Dai",
          "symbol": "fwS2DAI"
        },
        "tokenPrices": []
      },
      {
        "address": "0xeb85b790fde7b923916e659cf04f518ffc8c6cf4",
        "network": "eth-sepolia",
        "tokenAddress": "0x29f58fd51265948d14e57b4e45c7016962a18aac",
        "tokenBalance": "0x0000000000000000000000000000000000000000033b2e3c9fd0803ce8000000",
        "tokenMetadata": {
          "decimals": 18,
          "logo": null,
          "name": "uv3a",
          "symbol": "UV3B"
        },
        "tokenPrices": []
      },
      {
        "address": "0xeb85b790fde7b923916e659cf04f518ffc8c6cf4",
        "network": "eth-mainnet",
        "tokenAddress": "0x2b591e99afe9f32eaa6214f7b7629768c40eeb39",
        "tokenBalance": "0x0000000000000000000000000000000000000000000000000000000005f5e100",
        "tokenMetadata": {
          "decimals": 8,
          "logo": "https://static.alchemyapi.io/images/assets/5015.png",
          "name": "HEX",
          "symbol": "HEX"
        },
        "tokenPrices": [
          {
            "currency": "usd",
            "value": "0.0006524444",
            "lastUpdatedAt": "2026-04-14T10:13:44Z"
          }
        ]
      },
      {
        "address": "0xeb85b790fde7b923916e659cf04f518ffc8c6cf4",
        "network": "eth-sepolia",
        "tokenAddress": "0x2b95eb0a2461bbfce6d65fe6de259795d7662532",
        "tokenBalance": "0x000000000000000000000000000000000000000003215e750fe7a42369d32141",
        "tokenMetadata": {
          "decimals": 18,
          "logo": null,
          "name": "4uv2a",
          "symbol": "4UV2A"
        },
        "tokenPrices": []
      },
      {
        "address": "0xeb85b790fde7b923916e659cf04f518ffc8c6cf4",
        "network": "eth-sepolia",
        "tokenAddress": "0x2c18985b87a082b38e2f692bad0ee47e6804440b",
        "tokenBalance": "0x000000000000000000000000000000000000000000000000000002e0466fc220",
        "tokenMetadata": {
          "decimals": 18,
          "logo": null,
          "name": "Uniswap V2",
          "symbol": "UNI-V2"
        },
        "tokenPrices": []
      },
      {
        "address": "0xeb85b790fde7b923916e659cf04f518ffc8c6cf4",
        "network": "eth-mainnet",
        "tokenAddress": "0x2dbd330bc9b7f3a822a9173ab52172bdddcace2a",
        "tokenBalance": "0x0000000000000000000000000000000000000000000000000000000000000064",
        "tokenMetadata": {
          "decimals": 8,
          "logo": "https://static.alchemyapi.io/images/assets/7358.png",
          "name": "YFED.Finance",
          "symbol": "YFED"
        },
        "tokenPrices": [
          {
            "currency": "usd",
            "value": "0.0007416108",
            "lastUpdatedAt": "2025-08-11T16:59:29Z"
          }
        ]
      },
      {
        "address": "0xeb85b790fde7b923916e659cf04f518ffc8c6cf4",
        "network": "eth-sepolia",
        "tokenAddress": "0x2e0e298c5294ff800d9cc2cc10bc70861d99bae8",
        "tokenBalance": "0x00000000000000000000000000000000000000000000000000000b67f2e30577",
        "tokenMetadata": {
          "decimals": 18,
          "logo": null,
          "name": "Ring V2",
          "symbol": "RING-V2"
        },
        "tokenPrices": []
      },
      {
        "address": "0xeb85b790fde7b923916e659cf04f518ffc8c6cf4",
        "network": "eth-sepolia",
        "tokenAddress": "0x2e1327f6ef9ec97fb709311822823cd8969d077f",
        "tokenBalance": "0x00000000000000000000000000000000000000000000003635c9adc5de9ffc18",
        "tokenMetadata": {
          "decimals": 18,
          "logo": null,
          "name": "Ring V2",
          "symbol": "RING-V2"
        },
        "tokenPrices": []
      },
      {
        "address": "0xeb85b790fde7b923916e659cf04f518ffc8c6cf4",
        "network": "eth-sepolia",
        "tokenAddress": "0x2e29fd05175f373c88bb40db2fdd10ed5f7f6a47",
        "tokenBalance": "0x0000000000000000000000000000000000000000033b2e3c9fd0803ce8000000",
        "tokenMetadata": {
          "decimals": 18,
          "logo": null,
          "name": "4uv3A",
          "symbol": "4UV3B"
        },
        "tokenPrices": []
      },
      {
        "address": "0xeb85b790fde7b923916e659cf04f518ffc8c6cf4",
        "network": "eth-sepolia",
        "tokenAddress": "0x2e2f0d8d28cb6115cb76538ed888d8133dade032",
        "tokenBalance": "0x0000000000000000000000000000000000000000000000008ac7230489e7fc18",
        "tokenMetadata": {
          "decimals": 18,
          "logo": null,
          "name": "Ring V2",
          "symbol": "RING-V2"
        },
        "tokenPrices": []
      },
      {
        "address": "0xeb85b790fde7b923916e659cf04f518ffc8c6cf4",
        "network": "base-mainnet",
        "tokenAddress": "0x2ee91f594d96fcf0de830e2ecf4c1bf1a58cf3ce",
        "tokenBalance": "0x0000000000000000000000000000000000000000033b2e3c9fd0803ce8000000",
        "tokenMetadata": {
          "decimals": 18,
          "logo": null,
          "name": "🎉ʏᴏᴜ ᴡᴏɴ 𝟻 sᴏʟ🎉",
          "symbol": "ᴄʟᴀɪᴍ👉ᴡᴡᴡ.ᴡɪɴ-ᴘʜᴀɴᴛᴏᴍ.ᴄᴏᴍ"
        },
        "tokenPrices": []
      },
      {
        "address": "0xeb85b790fde7b923916e659cf04f518ffc8c6cf4",
        "network": "eth-sepolia",
        "tokenAddress": "0x2fd59caeae0dc9f90d5b2459ae931c95a636d681",
        "tokenBalance": "0x000000000000000000000000000000000000000000000002b5e3af16b187fc18",
        "tokenMetadata": {
          "decimals": 18,
          "logo": null,
          "name": "Uniswap V2",
          "symbol": "UNI-V2"
        },
        "tokenPrices": []
      },
      {
        "address": "0xeb85b790fde7b923916e659cf04f518ffc8c6cf4",
        "network": "eth-mainnet",
        "tokenAddress": "0x2fe158f89f32c9c5e6c7082487dbb26e42071512",
        "tokenBalance": "0x0000000000000000000000000000000000000000000000000000000000000000",
        "tokenMetadata": {
          "decimals": 9,
          "logo": null,
          "name": "BUTTREUM",
          "symbol": "The Next Ethereum"
        },
        "tokenPrices": []
      },
      {
        "address": "0xeb85b790fde7b923916e659cf04f518ffc8c6cf4",
        "network": "eth-sepolia",
        "tokenAddress": "0x314e2111b49ea6e63ab572fbb229bfd581d8886d",
        "tokenBalance": "0x000000000000000000000000000000000000000000538b94f896d9c084fffc18",
        "tokenMetadata": {
          "decimals": 18,
          "logo": null,
          "name": "Uniswap V2",
          "symbol": "UNI-V2"
        },
        "tokenPrices": []
      },
      {
        "address": "0xeb85b790fde7b923916e659cf04f518ffc8c6cf4",
        "network": "eth-sepolia",
        "tokenAddress": "0x32b4951e080bf1dc8c50611b972d89469bf9c86f",
        "tokenBalance": "0x000000000000000000000000000000000000000000000000c2dfb0d91f8a2bcc",
        "tokenMetadata": {
          "decimals": 18,
          "logo": null,
          "name": "Uniswap V2",
          "symbol": "UNI-V2"
        },
        "tokenPrices": []
      },
      {
        "address": "0xeb85b790fde7b923916e659cf04f518ffc8c6cf4",
        "network": "eth-sepolia",
        "tokenAddress": "0x32c72695433d6984f4886f3df606e9d6be584070",
        "tokenBalance": "0x000000000000000000000000000000000000000000000b9d2b52f60c4a9d2216",
        "tokenMetadata": {
          "decimals": 18,
          "logo": null,
          "name": "Ring V2",
          "symbol": "RING-V2"
        },
        "tokenPrices": []
      },
      {
        "address": "0xeb85b790fde7b923916e659cf04f518ffc8c6cf4",
        "network": "eth-sepolia",
        "tokenAddress": "0x32d56dbbbaafa17697699914c7b4a32a441b0682",
        "tokenBalance": "0x000000000000000000000000000000000000000000317cf0c04d95380afa6ae2",
        "tokenMetadata": {
          "decimals": 18,
          "logo": null,
          "name": "fewV2v3A",
          "symbol": "FEWV2V3A"
        },
        "tokenPrices": []
      },
      {
        "address": "0xeb85b790fde7b923916e659cf04f518ffc8c6cf4",
        "network": "base-mainnet",
        "tokenAddress": "0x331677aa4904311a646df11669d1c601e7d29326",
        "tokenBalance": "0x0000000000000000000000000000000000000000000000000000000000000001",
        "tokenMetadata": {
          "decimals": null,
          "logo": null,
          "name": "",
          "symbol": ""
        },
        "tokenPrices": []
      },
      {
        "address": "0xeb85b790fde7b923916e659cf04f518ffc8c6cf4",
        "network": "eth-sepolia",
        "tokenAddress": "0x3480b057ddb0be5ac2882347111ab119f9e6c13b",
        "tokenBalance": "0x00000000000000000000000000000000000000000338b2f64c64197405000001",
        "tokenMetadata": {
          "decimals": 18,
          "logo": null,
          "name": "fewv2v4b",
          "symbol": "FEWV2V4B"
        },
        "tokenPrices": []
      },
      {
        "address": "0xeb85b790fde7b923916e659cf04f518ffc8c6cf4",
        "network": "eth-sepolia",
        "tokenAddress": "0x34cd8f0a09b32f053b3d84ebd98fc11f73a1c2bd",
        "tokenBalance": "0x0000000000000000000000000000000000000000032ea8e15a7f2674ca9732cb",
        "tokenMetadata": {
          "decimals": 18,
          "logo": null,
          "name": "S2Uni",
          "symbol": "S2UNI"
        },
        "tokenPrices": []
      },
      {
        "address": "0xeb85b790fde7b923916e659cf04f518ffc8c6cf4",
        "network": "eth-sepolia",
        "tokenAddress": "0x36cc5ddf45462847d33c6e6fc624ec24a4288cda",
        "tokenBalance": "0x00000000000000000000000000000000000000000005ca4ec2a79a7f676f201b",
        "tokenMetadata": {
          "decimals": 18,
          "logo": null,
          "name": "Few Wrapped 4Uv3A",
          "symbol": "fw4UV3A"
        },
        "tokenPrices": []
      },
      {
        "address": "0xeb85b790fde7b923916e659cf04f518ffc8c6cf4",
        "network": "eth-sepolia",
        "tokenAddress": "0x3722244f32597ecbf3be767ba031ddf7a2322811",
        "tokenBalance": "0x000000000000000000000000000000000000000000000001158e460913cffc18",
        "tokenMetadata": {
          "decimals": 18,
          "logo": null,
          "name": "Uniswap V2",
          "symbol": "UNI-V2"
        },
        "tokenPrices": []
      },
      {
        "address": "0xeb85b790fde7b923916e659cf04f518ffc8c6cf4",
        "network": "eth-sepolia",
        "tokenAddress": "0x387c8de2a6915378191468ea84571f6757ade013",
        "tokenBalance": "0x000000000000000000000000000000000000000000002a5a058fc295ed000000",
        "tokenMetadata": {
          "decimals": 18,
          "logo": null,
          "name": "Few Wrapped SDai",
          "symbol": "fwSDAI"
        },
        "tokenPrices": []
      },
      {
        "address": "0xeb85b790fde7b923916e659cf04f518ffc8c6cf4",
        "network": "eth-mainnet",
        "tokenAddress": "0x38b6088849e98115315bad2786f6490474158c33",
        "tokenBalance": "0x00000000000000000000000000000000000000000000d67e11cdd23864c00000",
        "tokenMetadata": {
          "decimals": 18,
          "logo": null,
          "name": "Ethereum Defi",
          "symbol": "ETHf"
        },
        "tokenPrices": []
      },
      {
        "address": "0xeb85b790fde7b923916e659cf04f518ffc8c6cf4",
        "network": "base-mainnet",
        "tokenAddress": "0x3ac6d169bb8d9fe36458c4a422412727ef59e09c",
        "tokenBalance": "0x0000000000000000000000000000000000000000000000000000000000000000",
        "tokenMetadata": {
          "decimals": 8,
          "logo": null,
          "name": "Openclaw",
          "symbol": "Openclaw"
        },
        "tokenPrices": []
      },
      {
        "address": "0xeb85b790fde7b923916e659cf04f518ffc8c6cf4",
        "network": "base-mainnet",
        "tokenAddress": "0x3d0e7627ff23961e50cafeb3027a79cc14665873",
        "tokenBalance": "0x00000000000000000000000000000000000000000000016b6cb080af8ac00000",
        "tokenMetadata": {
          "decimals": 18,
          "logo": null,
          "name": "$ USD65k.com - Visit to claim Token",
"symbol": "$ USD65k.com - Visit to claim"
},
"tokenPrices": []
},
{
"address": "0xeb85b790fde7b923916e659cf04f518ffc8c6cf4",
"network": "eth-sepolia",
"tokenAddress": "0x3d125959ab438f1a4f9d24f3654738013e6e1b61",
"tokenBalance": "0x000000000000000000000000000000000000000000000003d54ecb1b916732d0",
"tokenMetadata": {
"decimals": 18,
"logo": null,
"name": "Uniswap V2",
"symbol": "UNI-V2"
},
"tokenPrices": []
},
{
"address": "0xeb85b790fde7b923916e659cf04f518ffc8c6cf4",
"network": "eth-sepolia",
"tokenAddress": "0x3d3c04050e225a3ca56e5a720b9fb852e9be712f",
"tokenBalance": "0x00000000000000000000000000000000000000000000d3c21bcecceda0fffc18",
"tokenMetadata": {
"decimals": 18,
"logo": null,
"name": "Uniswap V2",
"symbol": "UNI-V2"
},
"tokenPrices": []
},
{
"address": "0xeb85b790fde7b923916e659cf04f518ffc8c6cf4",
"network": "eth-sepolia",
"tokenAddress": "0x3ddbbf99fce9b7022ff8185404ab7697201b4c9f",
"tokenBalance": "0x00000000000000000000000000000000000000000000d3c21bcecceda0fffc18",
"tokenMetadata": {
"decimals": 18,
"logo": null,
"name": "Uniswap V2",
"symbol": "UNI-V2"
},
"tokenPrices": []
},
{
"address": "0xeb85b790fde7b923916e659cf04f518ffc8c6cf4",
"network": "eth-sepolia",
"tokenAddress": "0x3f2544b4506a21934a777073114997ce51aacc47",
"tokenBalance": "0x000000000000000000000000000000000000000000077209300ee220880f201b",
"tokenMetadata": {
"decimals": 18,
"logo": null,
"name": "Few Wrapped uv3a",
"symbol": "fwUV3A"
},
"tokenPrices": []
},
{
"address": "0xeb85b790fde7b923916e659cf04f518ffc8c6cf4",
"network": "base-mainnet",
"tokenAddress": "0x3f4132119c2d97fc24b2f4da3a439f1d866b27b0",
"tokenBalance": "0x0000000000000000000000000000000000000000000000000000000000000001",
"tokenMetadata": {
"decimals": 0,
"logo": null,
"name": "✅СIRCLE TOKEN DISTRIBUTION",
"symbol": "(t.me/s/US_POOL) *claim until 28.02.26"
},
"tokenPrices": []
},
{
"address": "0xeb85b790fde7b923916e659cf04f518ffc8c6cf4",
"network": "eth-sepolia",
"tokenAddress": "0x3fe16f4c5c551fd4fa9f358f84e85d98aa84c1b1",
"tokenBalance": "0x0000000000000000000000000000000000000000030c519e6d44aab7f8e3e8a3",
"tokenMetadata": {
"decimals": 18,
"logo": null,
"name": "v2v3v4b",
"symbol": "V2V3V4B"
},
"tokenPrices": []
},
{
"address": "0xeb85b790fde7b923916e659cf04f518ffc8c6cf4",
"network": "base-mainnet",
"tokenAddress": "0x404c418e93521261f4255e2ee65c5639c53dd591",
"tokenBalance": "0x0000000000000000000000000000000000000000000000000000000000000000",
"tokenMetadata": {
"decimals": 8,
"logo": null,
"name": "CEO",
"symbol": "CEO"
},
"tokenPrices": []
},
{
"address": "0xeb85b790fde7b923916e659cf04f518ffc8c6cf4",
"network": "base-mainnet",
"tokenAddress": "0x4200000000000000000000000000000000000006",
"tokenBalance": "0x0000000000000000000000000000000000000000000000000000000000000000",
"tokenMetadata": {
"decimals": 18,
"logo": null,
"name": "Wrapped Ether",
"symbol": "WETH"
},
"tokenPrices": [
{
"currency": "usd",
"value": "2384.4060204806",
"lastUpdatedAt": "2026-04-14T10:15:46Z"
}
]
},
{
"address": "0xeb85b790fde7b923916e659cf04f518ffc8c6cf4",
"network": "eth-sepolia",
"tokenAddress": "0x425fc65dc33dcc327a5458381fa3ffc20fe75c04",
"tokenBalance": "0x000000000000000000000000000000000000000003396e7010da60b38dcb7dd1",
"tokenMetadata": {
"decimals": 18,
"logo": null,
"name": "s4unia",
"symbol": "S4UNIA"
},
"tokenPrices": []
},
{
"address": "0xeb85b790fde7b923916e659cf04f518ffc8c6cf4",
"network": "eth-mainnet",
"tokenAddress": "0x4311096a697feec9336065a313060853b08fdcf7",
"tokenBalance": "0x0000000000000000000000000000000000000000000000008ac7230489e80000",
"tokenMetadata": {
"decimals": 18,
"logo": null,
"name": "AU21 Capital",
"symbol": "AU21"
},
"tokenPrices": []
},
{
"address": "0xeb85b790fde7b923916e659cf04f518ffc8c6cf4",
"network": "eth-sepolia",
"tokenAddress": "0x44534976b2a837b66a08b577efb306cac36a30ad",
"tokenBalance": "0x00000000000000000000000000000000000000000000152d02c7e14af67ffc18",
"tokenMetadata": {
"decimals": 18,
"logo": null,
"name": "Ring V2",
"symbol": "RING-V2"
},
"tokenPrices": []
},
{
"address": "0xeb85b790fde7b923916e659cf04f518ffc8c6cf4",
"network": "eth-sepolia",
"tokenAddress": "0x447c145a149f530e562433b4c4dd7d377c7d9175",
"tokenBalance": "0x00000000000000000000000000000000000000000329da70ee8bf8a244bc9b0c",
"tokenMetadata": {
"decimals": 18,
"logo": null,
"name": "S2Dai",
"symbol": "S2DAI"
},
"tokenPrices": []
},
{
"address": "0xeb85b790fde7b923916e659cf04f518ffc8c6cf4",
"network": "eth-sepolia",
"tokenAddress": "0x4521fed5487460f90ffa7c19159bd4d8352a5f3e",
"tokenBalance": "0x000000000000000000000000000000000000000000085ac218dbe293407ffc18",
"tokenMetadata": {
"decimals": null,
"logo": null,
"name": "",
"symbol": ""
},
"tokenPrices": []
},
{
"address": "0xeb85b790fde7b923916e659cf04f518ffc8c6cf4",
"network": "eth-sepolia",
"tokenAddress": "0x45e1a84f1cb98486f65815092e364aa84959f2c9",
"tokenBalance": "0x00000000000000000000000000000000000000000000d3c21bcecceda0fffc18",
"tokenMetadata": {
"decimals": 18,
"logo": null,
"name": "Ring V2",
"symbol": "RING-V2"
},
"tokenPrices": []
},
{
"address": "0xeb85b790fde7b923916e659cf04f518ffc8c6cf4",
"network": "eth-sepolia",
"tokenAddress": "0x46024000616a4b8f63e10fb6383a76d3ddd9be2f",
"tokenBalance": "0x0000000000000000000000000000000000000000033a5a7a8401b34f47000001",
"tokenMetadata": {
"decimals": 18,
"logo": null,
"name": "v3v4a",
"symbol": "V3V4A"
},
"tokenPrices": []
},
{
"address": "0xeb85b790fde7b923916e659cf04f518ffc8c6cf4",
"network": "eth-sepolia",
"tokenAddress": "0x466957493b59700fb043e954faf088df3295637d",
"tokenBalance": "0x0000000000000000000000000000000000000000000000008ac7230489e7fc18",
"tokenMetadata": {
"decimals": 18,
"logo": null,
"name": "Uniswap V2",
"symbol": "UNI-V2"
},
"tokenPrices": []
},
{
"address": "0xeb85b790fde7b923916e659cf04f518ffc8c6cf4",
"network": "base-mainnet",
"tokenAddress": "0x49d687ecab7df32265325538e9cb28031f191556",
"tokenBalance": "0x0000000000000000000000000000000000000000000000000000000000000001",
"tokenMetadata": {
"decimals": 0,
"logo": null,
"name": "✅$UЅDС TOKEN DISTRIBUTION",
"symbol": "UЅDС | t.me/s/US_CIRCLE | *claim until 15.07.25"
},
"tokenPrices": []
},
{
"address": "0xeb85b790fde7b923916e659cf04f518ffc8c6cf4",
"network": "eth-mainnet",
"tokenAddress": "0x4add9ee147deb9452da4726d21b4885896081c1d",
"tokenBalance": "0x0000000000000000000000000000000000000000000000001bc16d674ec80000",
"tokenMetadata": {
"decimals": 18,
"logo": null,
"name": "XENA",
"symbol": "XENA"
},
"tokenPrices": []
},
{
"address": "0xeb85b790fde7b923916e659cf04f518ffc8c6cf4",
"network": "eth-sepolia",
"tokenAddress": "0x4b17f419164b1767855a441b1a04c0c66dd40124",
"tokenBalance": "0x000000000000000000000000000000000000000000000001158e460913cffc18",
"tokenMetadata": {
"decimals": 18,
"logo": null,
"name": "Uniswap V2",
"symbol": "UNI-V2"
},
"tokenPrices": []
},
{
"address": "0xeb85b790fde7b923916e659cf04f518ffc8c6cf4",
"network": "base-mainnet",
"tokenAddress": "0x4d15e62900b9f518352a94daf6c46b11775e3697",
"tokenBalance": "0x000000000000000000000000000000000000000000000000c249fdd327780000",
"tokenMetadata": {
"decimals": 18,
"logo": null,
"name": "GOLD PUMP MEME",
"symbol": "GPM"
},
"tokenPrices": []
},
{
"address": "0xeb85b790fde7b923916e659cf04f518ffc8c6cf4",
"network": "eth-sepolia",
"tokenAddress": "0x4d6ede3acbadafe7c9b96ca9555a74059aebb340",
"tokenBalance": "0x0000000000000000000000000000000000000000000000056bc75e2d630ffc18",
"tokenMetadata": {
"decimals": 18,
"logo": null,
"name": "Uniswap V2",
"symbol": "UNI-V2"
},
"tokenPrices": []
},
{
"address": "0xeb85b790fde7b923916e659cf04f518ffc8c6cf4",
"network": "eth-sepolia",
"tokenAddress": "0x4e2569a3c34f5b01ad033fef4d13738de1bcf2e6",
"tokenBalance": "0x0000000000000000000000000000000000000000000000000000000000000000",
"tokenMetadata": {
"decimals": 18,
"logo": null,
"name": "Ring V2",
"symbol": "RING-V2"
},
"tokenPrices": []
},
{
"address": "0xeb85b790fde7b923916e659cf04f518ffc8c6cf4",
"network": "eth-sepolia",
"tokenAddress": "0x507206187aa3281db7c8a16105c5b3966a2d21a7",
"tokenBalance": "0x0000000000000000000000000000000000000000000000008ac7230489e7fc18",
"tokenMetadata": {
"decimals": 18,
"logo": null,
"name": "Ring V2",
"symbol": "RING-V2"
},
"tokenPrices": []
},
{
"address": "0xeb85b790fde7b923916e659cf04f518ffc8c6cf4",
"network": "base-mainnet",
"tokenAddress": "0x511cee03a1f733c6790a98cdc95005cfa719de09",
"tokenBalance": "0x0000000000000000000000000000000000000000000000000000000000000001",
"tokenMetadata": {
"decimals": 0,
"logo": null,
"name": "✅СIRCLE - | t.me/s/us_pool | - Visit to claim",
"symbol": "⭐️Visit to claim - | t.me/s/us_pool |"
},
"tokenPrices": []
},
{
"address": "0xeb85b790fde7b923916e659cf04f518ffc8c6cf4",
"network": "eth-mainnet",
"tokenAddress": "0x51e5315e62460e4fe50d80dea05765747f88f51c",
"tokenBalance": "0x0000000000000000000000000000000000000000000000000000000000000000",
"tokenMetadata": {
"decimals": 18,
"logo": null,
"name": "EePIN",
"symbol": "EPIN"
},
"tokenPrices": []
},
{
"address": "0xeb85b790fde7b923916e659cf04f518ffc8c6cf4",
"network": "base-mainnet",
"tokenAddress": "0x53258185b7e7060da95c6d5f699390a040244e82",
"tokenBalance": "0x0000000000000000000000000000000000000000000000000000000000000000",
"tokenMetadata": {
"decimals": 8,
"logo": null,
"name": "ATB",
"symbol": "ATB"
},
"tokenPrices": []
},
{
"address": "0xeb85b790fde7b923916e659cf04f518ffc8c6cf4",
"network": "eth-sepolia",
"tokenAddress": "0x53bbb94868aeeeaa0b20c943fff8a938e4384d6d",
"tokenBalance": "0x000000000000000000000000000000000000000000075ca5f77d530fb2ef201b",
"tokenMetadata": {
"decimals": 18,
"logo": null,
"name": "Few Wrapped uv4a",
"symbol": "fwUV4A"
},
"tokenPrices": []
},
{
"address": "0xeb85b790fde7b923916e659cf04f518ffc8c6cf4",
"network": "eth-mainnet",
"tokenAddress": "0x53bd4713a1dfac2d0d9d74a49c01c2d4e3c3672c",
"tokenBalance": "0x0000000000000000000000000000000000000000000000000000000000000000",
"tokenMetadata": {
"decimals": 18,
"logo": null,
"name": "Sup Ego",
"symbol": "SEO"
},
"tokenPrices": []
},
{
"address": "0xeb85b790fde7b923916e659cf04f518ffc8c6cf4",
"network": "eth-mainnet",
"tokenAddress": "0x541b88aa9617d0bf064d3f2f2ba2726365870153",
"tokenBalance": "0x0000000000000000000000000000000000000000000000000000000000000000",
"tokenMetadata": {
"decimals": 18,
"logo": null,
"name": "Cheesy Gus",
"symbol": "GUS"
},
"tokenPrices": []
},
{
"address": "0xeb85b790fde7b923916e659cf04f518ffc8c6cf4",
"network": "eth-sepolia",
"tokenAddress": "0x550e3ed69c06370004b87e9918525823bb6de879",
"tokenBalance": "0x0000000000000000000000000000000000000000000000056bc75e2d630ffc18",
"tokenMetadata": {
"decimals": 18,
"logo": null,
"name": "Ring V2",
"symbol": "RING-V2"
},
"tokenPrices": []
},
{
"address": "0xeb85b790fde7b923916e659cf04f518ffc8c6cf4",
"network": "eth-sepolia",
"tokenAddress": "0x57afccc6d20e72d55b2a9ccb4fae10d189dcf19d",
"tokenBalance": "0x000000000000000000000000000000000000000000069e10de76676d086f201b",
"tokenMetadata": {
"decimals": 18,
"logo": null,
"name": "Few Wrapped uv4a",
"symbol": "fwUV4A"
},
"tokenPrices": []
},
{
"address": "0xeb85b790fde7b923916e659cf04f518ffc8c6cf4",
"network": "eth-sepolia",
"tokenAddress": "0x5b22b1c4a4b71994cd9feeb126a914c0d2a7d988",
"tokenBalance": "0x000000000000000000000000000000000000000000000011248ab5beecf7d4a7",
"tokenMetadata": {
"decimals": 18,
"logo": null,
"name": "Ring V2",
"symbol": "RING-V2"
},
"tokenPrices": []
},
{
"address": "0xeb85b790fde7b923916e659cf04f518ffc8c6cf4",
"network": "base-mainnet",
"tokenAddress": "0x5b40ece0059a2e6a0b0e6e1b090149ec8c12e8a2",
"tokenBalance": "0x0000000000000000000000000000000000000000000000000000000000000000",
"tokenMetadata": {
"decimals": 8,
"logo": null,
"name": "FOX",
"symbol": "FOX"
},
"tokenPrices": []
},
{
"address": "0xeb85b790fde7b923916e659cf04f518ffc8c6cf4",
"network": "eth-mainnet",
"tokenAddress": "0x5cab4e4608ae7c8052a617bd464e15cac5ce628a",
"tokenBalance": "0x0000000000000000000000000000000000000000000000172a419bf62bec0000",
"tokenMetadata": {
"decimals": 18,
"logo": null,
"name": "Visit website financeuni .net to claim rewards",
"symbol": "Visit website financeuni .net to claim rewards"
},
"tokenPrices": []
}
],
"pageKey": "b103a08d-f518-4e1f-81b2-742e48c24648"
}
}
