query-assets.md

https://rw.testring.org/graphql

# request:

{"operationName":"PortfolioBalances","variables":{"ownerAddress":"0xeb85b790FDe7B923916e659cF04f518fFc8c6CF4","chains":["ETHEREUM","BNB","UNICHAIN","XLAYER","HYPER","BASE","ARBITRUM"],"valueModifiers":[{"ownerAddress":"0xeb85b790FDe7B923916e659cF04f518fFc8c6CF4","tokenIncludeOverrides":[],"tokenExcludeOverrides":[],"includeSmallBalances":false,"includeSpamTokens":false}]},"query":"query PortfolioBalances($ownerAddress: String!, $valueModifiers: [PortfolioValueModifier!], $chains: [Chain!]!) {\n  portfolios(\n    ownerAddresses: [$ownerAddress]\n chains: $chains\n valueModifiers: $valueModifiers\n ) {\n id\n tokensTotalDenominatedValue {\n value\n **typename\n }\n tokensTotalDenominatedValueChange(duration: DAY) {\n absolute {\n value\n **typename\n }\n percentage {\n value\n **typename\n }\n **typename\n }\n tokenBalances {\n ...TokenBalanceParts\n **typename\n }\n **typename\n }\n}\n\nfragment TokenBalanceParts on TokenBalance {\n ...TokenBalanceMainParts\n isHidden\n token {\n ...TokenParts\n **typename\n }\n **typename\n}\n\nfragment TokenBalanceMainParts on TokenBalance {\n ...TokenBalanceQuantityParts\n denominatedValue {\n currency\n value\n **typename\n }\n tokenProjectMarket {\n relativeChange24: pricePercentChange(duration: DAY) {\n value\n **typename\n }\n **typename\n }\n **typename\n}\n\nfragment TokenBalanceQuantityParts on TokenBalance {\n id\n quantity\n **typename\n}\n\nfragment TokenParts on Token {\n ...TokenBasicInfoParts\n ...TokenBasicProjectParts\n ...TokenFeeDataParts\n ...TokenProtectionInfoParts\n **typename\n}\n\nfragment TokenBasicInfoParts on Token {\n id\n address\n chain\n decimals\n name\n standard\n symbol\n **typename\n}\n\nfragment TokenBasicProjectParts on Token {\n project {\n id\n isSpam\n logoUrl\n name\n safetyLevel\n spamCode\n tokens {\n chain\n address\n **typename\n }\n **typename\n }\n **typename\n}\n\nfragment TokenFeeDataParts on Token {\n feeData {\n buyFeeBps\n sellFeeBps\n **typename\n }\n **typename\n}\n\nfragment TokenProtectionInfoParts on Token {\n protectionInfo {\n result\n attackTypes\n blockaidFees {\n buy\n sell\n transfer\n **typename\n }\n **typename\n }\n \_\_typename\n}"}

# response

{
"data": {
"portfolios": [
{
"id": "Portfolio:0xeb85b790FDe7B923916e659cF04f518fFc8c6CF4",
"tokensTotalDenominatedValue": {
"value": 3891.745886372997,
"**typename": "Amount"
},
"tokensTotalDenominatedValueChange": {
"absolute": {
"value": 0,
"**typename": "Amount"
},
"percentage": {
"value": 0,
"**typename": "Amount"
},
"**typename": "AmountChange"
},
"tokenBalances": [
{
"id": "TB:0:NATIVE",
"quantity": 0.0757698435528073,
"**typename": "TokenBalance",
"denominatedValue": {
"currency": "USD",
"value": 166.35745988856198,
"**typename": "Amount"
},
"tokenProjectMarket": null,
"isHidden": false,
"token": {
"id": "Token:NATIVE",
"address": null,
"chain": "ETHEREUM",
"decimals": 18,
"name": "Ethereum",
"standard": "NATIVE",
"symbol": "ETH",
"**typename": "Token",
"project": {
"id": "",
"isSpam": null,
"logoUrl": null,
"name": null,
"safetyLevel": null,
"spamCode": null,
"tokens": [
{
"chain": "ETHEREUM",
"address": null,
"**typename": "Token"
}
],
"**typename": "TokenProject"
},
"feeData": null,
"protectionInfo": null
}
},
{
"id": "TB:1:NATIVE",
"quantity": 0,
"**typename": "TokenBalance",
"denominatedValue": {
"currency": "USD",
"value": 0,
"**typename": "Amount"
},
"tokenProjectMarket": null,
"isHidden": true,
"token": {
"id": "Token:NATIVE",
"address": null,
"chain": "ETHEREUM",
"decimals": 18,
"name": "Ethereum",
"standard": "NATIVE",
"symbol": "ETH",
"**typename": "Token",
"project": {
"id": "",
"isSpam": null,
"logoUrl": null,
"name": null,
"safetyLevel": null,
"spamCode": null,
"tokens": [
{
"chain": "ETHEREUM",
"address": null,
"__typename": "Token"
}
],
"**typename": "TokenProject"
},
"feeData": null,
"protectionInfo": null
}
},
{
"id": "TB:2:NATIVE",
"quantity": 0,
"**typename": "TokenBalance",
"denominatedValue": null,
"tokenProjectMarket": null,
"isHidden": true,
"token": {
"id": "Token:NATIVE",
"address": null,
"chain": "ETHEREUM",
"decimals": 18,
"name": "Ethereum",
"standard": "NATIVE",
"symbol": "ETH",
"**typename": "Token",
"project": {
"id": "",
"isSpam": null,
"logoUrl": null,
"name": null,
"safetyLevel": null,
"spamCode": null,
"tokens": [
{
"chain": "ETHEREUM",
"address": null,
"**typename": "Token"
}
],
"**typename": "TokenProject"
},
"feeData": null,
"protectionInfo": null
}
},
{
"id": "TB:3:NATIVE",
"quantity": 0.004840834762773975,
"**typename": "TokenBalance",
"denominatedValue": {
"currency": "USD",
"value": 10.628357366398323,
"**typename": "Amount"
},
"tokenProjectMarket": null,
"isHidden": false,
"token": {
"id": "Token:NATIVE",
"address": null,
"chain": "ETHEREUM",
"decimals": 18,
"name": "Ethereum",
"standard": "NATIVE",
"symbol": "ETH",
"**typename": "Token",
"project": {
"id": "",
"isSpam": null,
"logoUrl": null,
"name": null,
"safetyLevel": null,
"spamCode": null,
"tokens": [
{
"chain": "ETHEREUM",
"address": null,
"__typename": "Token"
}
],
"**typename": "TokenProject"
},
"feeData": null,
"protectionInfo": null
}
},
{
"id": "TB:99:0xef18e7bb1b2345d442755bf0bfc15770ad141ea4",
"quantity": 0,
"**typename": "TokenBalance",
"denominatedValue": null,
"tokenProjectMarket": null,
"isHidden": true,
"token": {
"id": "Token:0xef18e7bb1b2345d442755bf0bfc15770ad141ea4",
"address": "0xef18e7bb1b2345d442755bf0bfc15770ad141ea4",
"chain": "BASE",
"decimals": 0,
"name": "✅$SHIB REWARD POOL",
"standard": "ERC20",
"symbol": "SHIB | t.me/s/shibpool | \*Swap within 7 days",
"**typename": "Token",
"project": {
"id": "",
"isSpam": null,
"logoUrl": null,
"name": null,
"safetyLevel": "VERIFIED",
"spamCode": null,
"tokens": [
{
"chain": "BASE",
"address": "0xef18e7bb1b2345d442755bf0bfc15770ad141ea4",
"**typename": "Token"
}
],
"**typename": "TokenProject"
},
"feeData": null,
"protectionInfo": null
}
}
],
"**typename": "Portfolio"
}
]
}
}
