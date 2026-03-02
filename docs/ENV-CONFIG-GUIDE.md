# 环境变量配置指南

本指南说明如何获取和配置 EIP-4337 所需的 EntryPoint 地址和 Bundler URL。

## 📋 需要配置的环境变量

根据您的代码，需要配置以下环境变量：

- `VITE_ENTRYPOINT_4337` - EntryPoint 合约地址（所有链共用）
- `VITE_FACTORY_*` - 各链的 Factory 合约地址（用于部署智能账户）
- `VITE_BUNDLER_*` - 各链的 Bundler URL
- `VITE_RPC_*` - 各链的 RPC URL

## 🔑 EntryPoint 地址

### EntryPoint v0.6 官方地址

EIP-4337 的 EntryPoint 合约有多个版本，目前最常用的是 **v0.6**：

**所有网络（Mainnet、Sepolia、Goerli 等）使用相同的地址：**

```
0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789
```

这是官方部署的 EntryPoint v0.6 合约地址，在所有支持 EIP-4337 的网络上都使用相同的地址。

### 验证地址

您可以在以下区块浏览器上验证：

- **Ethereum Mainnet**: https://etherscan.io/address/0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789
- **Sepolia Testnet**: https://sepolia.etherscan.io/address/0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789

### 获取最新地址

如果上述地址已更新，可以通过以下方式查找：

1. **官方 GitHub**: https://github.com/eth-infinitism/account-abstraction
2. **EIP-4337 文档**: https://eips.ethereum.org/EIPS/eip-4337
3. **区块浏览器搜索**: 在对应网络上搜索 "EntryPoint" 合约

## 🏭 Factory 合约地址

Factory 合约用于部署新的智能账户。当您的智能账户尚未部署时，需要使用 Factory 来创建账户。

### 重要说明

**Alchemy Smart Wallets**: 根据 [Alchemy 文档](https://www.alchemy.com/docs/wallets)，Alchemy 提供的是完整的 Smart Wallets SDK（Account Kit），而不是独立的 Factory 地址。如果您使用 Alchemy 的 Account Kit，账户部署由 SDK 自动处理，可能不需要手动配置 Factory 地址。

对于直接使用 EIP-4337 标准的项目，您有以下选择：

### 1. 使用 SimpleAccountFactory（推荐用于开发和测试）

SimpleAccountFactory 是 EIP-4337 参考实现中最常用的 Factory 合约。

#### 自行部署（推荐）

**GitHub 仓库**: https://github.com/eth-infinitism/account-abstraction

**部署步骤**:
1. 克隆仓库：`git clone https://github.com/eth-infinitism/account-abstraction.git`
2. 按照 README 中的说明部署 SimpleAccountFactory
3. 记录部署后的合约地址

#### 已部署的地址（社区维护，请验证）

⚠️ **注意**: 以下地址可能不适用于您的具体实现，建议自行部署或验证：

**Ethereum Mainnet**:
- 需要自行部署或查找社区部署的地址

**Sepolia Testnet**:
- 需要自行部署或查找社区部署的地址

### 2. 使用 Stackup 的 Factory

Stackup 提供了一些预部署的 Factory 合约，但地址需要查询其文档或联系支持。

**Stackup 文档**: https://docs.stackup.sh/
**Stackup 支持**: 通过其 Discord 或 GitHub 获取最新 Factory 地址

### 3. 使用 Pimlico 的 Factory

Pimlico 也可能提供 Factory 服务，请查阅其文档获取地址。

**Pimlico 文档**: https://docs.pimlico.io/

### 4. 使用 Alchemy Account Kit（替代方案）

如果您使用 Alchemy 的 Account Kit SDK，factory 地址由 SDK 内部管理，您不需要手动配置。但如果您想直接使用 EIP-4337 UserOperations（如您当前的实现），则需要独立的 Factory 地址。

**Alchemy Account Kit**: https://www.alchemy.com/docs/wallets

### 5. 自定义 EIP-7951 Factory

对于 EIP-7951（使用 Passkey/P-256 公钥），您需要部署支持 P-256 签名的 Factory 合约。这可能需要自定义实现或使用支持 EIP-7951 的 Factory。

### 如何获取 Factory 地址

1. **查询区块浏览器**:
   - 在 Etherscan/Sepoliascan 等浏览器搜索 "SimpleAccountFactory"
   - 或搜索您使用的特定 Factory 实现名称

2. **查看服务商文档**:
   - Stackup: https://docs.stackup.sh/
   - Pimlico: https://docs.pimlico.io/
   - Alchemy: https://www.alchemy.com/docs/wallets

3. **社区资源**:
   - EIP-4337 GitHub: https://github.com/eth-infinitism/account-abstraction
   - 开发者论坛和 Discord 频道

### 验证 Factory 地址

配置 Factory 地址后，可以通过以下方式验证：

1. **区块浏览器验证**:
   ```bash
   # 访问 Etherscan/Sepoliascan
   https://etherscan.io/address/YOUR_FACTORY_ADDRESS
   # 检查合约是否存在且已验证
   ```

2. **代码验证**:
   ```javascript
   const provider = new ethers.JsonRpcProvider(rpcUrl);
   const code = await provider.getCode(factoryAddress);
   console.log('Factory code exists:', code !== '0x');
   ```

### ⚠️ 重要提示

1. **Factory 地址可能因实现而异**: 
   - 不同的智能账户实现（SimpleAccount, Safe, 自定义等）需要不同的 Factory
   - EIP-7951 的实现可能需要特殊的 Factory

2. **每个链需要单独的 Factory**:
   - Mainnet、Sepolia、L2 网络都需要各自部署 Factory

3. **如果没有 Factory**:
   - 如果账户已经部署，可以暂时不配置 Factory（设置为空）
   - 代码会自动检测账户是否已部署，如果已部署则不需要 initCode

## 🌐 Bundler URL

Bundler 是处理 UserOperation 的服务节点。以下是一些可用的公共 Bundler 服务：

### 1. Stackup (推荐用于开发/测试)

Stackup 提供免费的公共 Bundler 服务：

**Sepolia Testnet:**
```
https://api.stackup.sh/v1/node/YOUR-API-KEY
```

**Mainnet:**
```
https://api.stackup.sh/v1/node/YOUR-API-KEY
```

**获取 API Key:**
1. 访问：https://app.stackup.sh/
2. 注册账号
3. 创建项目获取 API Key（免费套餐足够开发使用）

**免费套餐限制:**
- 每日请求限制
- 足够用于开发和测试

### 2. Alchemy

Alchemy 提供账户抽象的 Bundler 服务：

**Sepolia:**
```
https://eth-sepolia.g.alchemy.com/v2/YOUR-API-KEY
```

**Mainnet:**
```
https://eth-mainnet.g.alchemy.com/v2/YOUR-API-KEY
```

**获取 API Key:**
1. 访问：https://www.alchemy.com/
2. 注册账号
3. 创建应用获取 API Key

**注意**: 需要在 URL 后面添加 `/bundler` 路径，完整 URL 格式：
```
https://eth-sepolia.g.alchemy.com/v2/YOUR-API-KEY/bundler
```

### 3. Pimlico

Pimlico 提供免费的 Bundler 服务：

**Sepolia:**
```
https://api.pimlico.io/v1/sepolia/rpc?apikey=YOUR-API-KEY
```

**获取 API Key:**
1. 访问：https://www.pimlico.io/
2. 注册获取 API Key

### 4. 自建 Bundler（高级）

如果您想自己运行 Bundler：

**GitHub 仓库:**
- https://github.com/eth-infinitism/bundler
- https://github.com/stackup-wallet/stackup-bundler

**部署文档:**
- 参考官方文档部署到您的服务器
- 需要配置 RPC 节点和监控服务

## 🔗 RPC URL

您还需要配置各链的 RPC URL。以下是免费的公共 RPC：

### Ethereum Mainnet
```
https://eth.llamarpc.com
https://ethereum.publicnode.com
https://rpc.ankr.com/eth
```

### Sepolia Testnet
```
https://rpc.sepolia.org
https://ethereum-sepolia-rpc.publicnode.com
https://sepolia.infura.io/v3/YOUR-PROJECT-ID
```

### 推荐的 RPC 提供商

1. **Infura**: https://www.infura.io/ (需要注册，免费套餐)
2. **Alchemy**: https://www.alchemy.com/ (需要注册，免费套餐)
3. **QuickNode**: https://www.quicknode.com/ (需要注册)
4. **Public RPC**: 使用公共节点（可能有速率限制）

## 📝 配置文件示例

在项目根目录创建 `.env` 文件：

```env
# EntryPoint 地址（所有网络相同）
VITE_ENTRYPOINT_4337=0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789

# Ethereum Mainnet
VITE_RPC_ETH_MAINNET=https://eth.llamarpc.com
VITE_BUNDLER_ETH_MAINNET=https://api.stackup.sh/v1/node/YOUR-STACKUP-API-KEY
VITE_FACTORY_ETH_MAINNET=0x... # 您的 Factory 地址（可选，如果账户已部署可留空）

# Sepolia Testnet
VITE_RPC_SEPOLIA=https://rpc.sepolia.org
VITE_BUNDLER_SEPOLIA=https://api.stackup.sh/v1/node/YOUR-STACKUP-API-KEY
VITE_FACTORY_SEPOLIA=0x... # 您的 Factory 地址（可选，如果账户已部署可留空）

# Optimism
VITE_RPC_OPTIMISM=https://mainnet.optimism.io
VITE_BUNDLER_OPTIMISM=https://api.stackup.sh/v1/node/YOUR-STACKUP-API-KEY
VITE_FACTORY_OPTIMISM=0x... # 您的 Factory 地址（可选）

# Arbitrum One
VITE_RPC_ARBITRUM=https://arb1.arbitrum.io/rpc
VITE_BUNDLER_ARBITRUM=https://api.stackup.sh/v1/node/YOUR-STACKUP-API-KEY
VITE_FACTORY_ARBITRUM=0x... # 您的 Factory 地址（可选）

# Polygon
VITE_RPC_POLYGON=https://polygon-rpc.com
VITE_BUNDLER_POLYGON=https://api.stackup.sh/v1/node/YOUR-STACKUP-API-KEY
VITE_FACTORY_POLYGON=0x... # 您的 Factory 地址（可选）
```

### 开发环境配置（`.env.development`）

```env
# 开发环境使用测试网
VITE_ENTRYPOINT_4337=0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789

# Sepolia Testnet (开发用)
VITE_RPC_SEPOLIA=https://rpc.sepolia.org
VITE_BUNDLER_SEPOLIA=https://api.stackup.sh/v1/node/YOUR-STACKUP-API-KEY
VITE_FACTORY_SEPOLIA=0x... # 您的 Factory 地址（可选，如果账户已部署可留空）

# 其他网络可以留空或使用测试网
VITE_RPC_ETH_MAINNET=
VITE_BUNDLER_ETH_MAINNET=
VITE_FACTORY_ETH_MAINNET=
```

## 🚀 快速开始（最小配置）

如果只是想快速测试，最小配置如下：

```env
# EntryPoint 地址
VITE_ENTRYPOINT_4337=0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789

# Sepolia Testnet（测试用）
VITE_RPC_SEPOLIA=https://rpc.sepolia.org
VITE_BUNDLER_SEPOLIA=https://api.stackup.sh/v1/node/YOUR-STACKUP-API-KEY
VITE_FACTORY_SEPOLIA=0x... # 可选：如果账户未部署则需要 Factory 地址
```

**获取 Stackup API Key 步骤：**

1. 访问 https://app.stackup.sh/
2. 点击 "Sign Up" 注册（支持 GitHub 登录）
3. 登录后，点击 "Create Project"
4. 填写项目信息，选择 "Sepolia" 网络
5. 复制 API Key
6. 将 API Key 替换到 `YOUR-STACKUP-API-KEY` 位置

## ⚠️ 注意事项

1. **不要提交 `.env` 文件到 Git**
   - 确保 `.env` 在 `.gitignore` 中
   - API Key 是敏感信息，不应公开

2. **API Key 限制**
   - 免费套餐通常有速率限制
   - 生产环境建议使用付费服务或自建

3. **网络兼容性**
   - 确保 Bundler 支持目标网络
   - 某些 L2 网络可能需要特殊的 Bundler 配置

4. **EntryPoint 版本**
   - 当前推荐使用 v0.6
   - 不同版本的 EntryPoint 地址可能不同

## 🔍 验证配置

配置完成后，可以通过以下方式验证：

1. **检查环境变量是否加载**：
   ```javascript
   console.log('EntryPoint:', import.meta.env.VITE_ENTRYPOINT_4337);
   console.log('Bundler:', import.meta.env.VITE_BUNDLER_SEPOLIA);
   ```

2. **测试 Bundler 连接**：
   使用 curl 或 Postman 测试：
   ```bash
   curl -X POST https://api.stackup.sh/v1/node/YOUR-API-KEY \
     -H "Content-Type: application/json" \
     -d '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}'
   ```

3. **检查 EntryPoint 合约**：
   在区块浏览器查看合约是否存在且可调用

## 📚 参考资源

- **EIP-4337 官方**: https://eips.ethereum.org/EIPS/eip-4337
- **account-abstraction 仓库**: https://github.com/eth-infinitism/account-abstraction
- **Stackup 文档**: https://docs.stackup.sh/
- **Alchemy 文档**: https://docs.alchemy.com/
- **Bundler 实现**: https://github.com/eth-infinitism/bundler

## 🆘 常见问题

**Q: 免费 Bundler 服务有请求限制吗？**
A: 是的，免费套餐通常有每日请求限制，但足够用于开发和测试。

**Q: 可以同时使用多个 Bundler 吗？**
A: 理论上可以，但通常选择一个主要的即可。您的代码目前每个网络只使用一个。

**Q: EntryPoint 地址会改变吗？**
A: v0.6 地址是稳定的，但如果推出新版本，地址可能会不同。

**Q: 如何找到特定 L2 网络的 Bundler？**
A: 查看对应 L2 网络的官方文档，或使用支持多链的 Bundler 服务（如 Stackup）。

**Q: Factory 地址是必需的吗？**
A: 不是必需的。如果您的智能账户已经部署，则不需要 Factory 地址。代码会自动检测账户是否已部署，只有在账户未部署且需要首次部署时才需要 Factory 地址。

**Q: Alchemy Smart Wallets 提供 Factory 地址吗？**
A: Alchemy 的 Smart Wallets SDK (Account Kit) 内部管理账户部署，不直接暴露 Factory 地址。如果您使用 Alchemy 的 SDK，账户部署由 SDK 处理。但如果您直接使用 EIP-4337 UserOperations（如本项目的实现），则需要独立的 Factory 地址。建议自行部署 SimpleAccountFactory 或联系 Alchemy 支持获取信息。

**Q: 如何知道我的账户是否已部署？**
A: 代码会在发送交易前自动检查。如果账户未部署且没有配置 Factory，会在 UI 中显示警告信息。

