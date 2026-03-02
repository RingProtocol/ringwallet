# Factory 地址获取指南

## 📋 概述

Factory 合约用于部署新的智能账户。当您的智能账户尚未部署时，需要使用 Factory 来创建账户。

## 🔍 关于 Alchemy Smart Wallets

根据 [Alchemy Smart Wallets 文档](https://www.alchemy.com/docs/wallets)，Alchemy 提供的是**完整的 Smart Wallets SDK (Account Kit)**，而不是独立的 Factory 地址。

### Alchemy 的方式

- **使用 Alchemy SDK**: 账户部署由 SDK 内部自动处理，您**不需要**手动配置 Factory 地址
- **直接使用 EIP-4337**: 如果您直接发送 UserOperations（如本项目），则需要独立的 Factory 地址

### 本项目的情况

本项目直接使用 EIP-4337 UserOperations，因此需要配置 Factory 地址（如果账户未部署）。

## 🛠️ 获取 Factory 地址的方法

### 方法 1: 自行部署 SimpleAccountFactory（推荐）

这是最可靠的方法，您可以完全控制 Factory 合约。

#### 步骤：

1. **克隆官方仓库**:
   ```bash
   git clone https://github.com/eth-infinitism/account-abstraction.git
   cd account-abstraction
   ```

2. **安装依赖**:
   ```bash
   npm install
   ```

3. **部署 SimpleAccountFactory**:
   - 使用 Hardhat、Foundry 或 Remix 部署
   - 记录部署后的合约地址

4. **配置到 .env**:
   ```env
   VITE_FACTORY_SEPOLIA=0x您的Factory地址
   ```

#### 官方仓库资源

- **GitHub**: https://github.com/eth-infinitism/account-abstraction
- **文档**: 查看仓库 README 中的部署说明

### 方法 2: 查询服务商文档

#### Stackup

- **文档**: https://docs.stackup.sh/
- **Discord**: 通过 Stackup 的 Discord 社区询问 Factory 地址
- **GitHub**: https://github.com/stackup-wallet/stackup-bundler

#### Pimlico

- **文档**: https://docs.pimlico.io/
- **支持**: 通过其文档或支持渠道获取 Factory 地址

#### Alchemy

- **文档**: https://www.alchemy.com/docs/wallets
- **注意**: Alchemy 主要提供 SDK，可能不直接提供独立的 Factory 地址
- **建议**: 联系 Alchemy 支持团队询问是否有可用的 Factory 地址

### 方法 3: 在区块浏览器中查找

1. **访问区块浏览器**:
   - Ethereum Mainnet: https://etherscan.io/
   - Sepolia Testnet: https://sepolia.etherscan.io/

2. **搜索关键词**:
   - "SimpleAccountFactory"
   - "AccountFactory"
   - "EIP-4337 Factory"

3. **验证合约**:
   - 确认合约已验证
   - 检查合约源码是否符合您的需求
   - 验证是否在正确的网络上

### 方法 4: 社区资源

- **EIP-4337 官方 GitHub**: https://github.com/eth-infinitism/account-abstraction
- **开发者社区**: 
  - Ethereum Stack Exchange
  - Reddit r/ethereum
  - Discord 开发者频道

## ⚠️ 重要注意事项

### 1. Factory 地址可能因实现而异

不同的智能账户实现需要不同的 Factory：

- **SimpleAccount**: 需要 SimpleAccountFactory
- **Safe**: 需要 Safe Factory
- **自定义实现**: 需要对应的自定义 Factory
- **EIP-7951**: 可能需要支持 P-256 签名的特殊 Factory

### 2. 每个链都需要单独的 Factory

- Mainnet 需要 Mainnet Factory
- Sepolia 需要 Sepolia Factory
- 每个 L2 网络都需要各自部署

### 3. Factory 地址不是必需的（如果账户已部署）

如果您的智能账户已经部署，则：
- **不需要**配置 Factory 地址
- 代码会自动检测账户是否已部署
- 只有在账户未部署时才需要 Factory

## 🧪 测试建议

### 开发环境（Sepolia Testnet）

1. **自行部署 SimpleAccountFactory 到 Sepolia**
2. **配置 .env**:
   ```env
   VITE_FACTORY_SEPOLIA=0x您的SepoliaFactory地址
   ```

3. **测试账户部署**:
   - 发送第一笔交易时，应该自动部署账户
   - 检查是否成功部署

### 生产环境（Mainnet）

1. **自行部署或使用可信的 Factory**
2. **充分测试部署流程**
3. **验证 Gas 成本**（首次部署需要额外 Gas）

## 📝 .env 配置示例

```env
# EntryPoint 地址（所有网络相同）
VITE_ENTRYPOINT_4337=0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789

# Sepolia Testnet
VITE_RPC_SEPOLIA=https://rpc.sepolia.org
VITE_BUNDLER_SEPOLIA=https://api.stackup.sh/v1/node/YOUR-API-KEY
VITE_FACTORY_SEPOLIA=0x... # 可选：如果账户未部署则需要

# Ethereum Mainnet
VITE_RPC_ETH_MAINNET=https://eth.llamarpc.com
VITE_BUNDLER_ETH_MAINNET=https://api.stackup.sh/v1/node/YOUR-API-KEY
VITE_FACTORY_ETH_MAINNET=0x... # 可选：如果账户未部署则需要
```

## 🔗 有用链接

- **EIP-4337 官方文档**: https://eips.ethereum.org/EIPS/eip-4337
- **Account Abstraction 仓库**: https://github.com/eth-infinitism/account-abstraction
- **Stackup 文档**: https://docs.stackup.sh/
- **Pimlico 文档**: https://docs.pimlico.io/
- **Alchemy Smart Wallets**: https://www.alchemy.com/docs/wallets
- **SimpleAccount 实现**: https://github.com/eth-infinitism/account-abstraction/tree/main/contracts/samples

## ❓ 常见问题

**Q: 我的账户已经部署了，还需要 Factory 吗？**
A: 不需要。代码会自动检测，如果账户已部署，Factory 地址会被忽略。

**Q: 如何知道我的账户是否已部署？**
A: 代码会在发送交易前自动检查。如果未部署且没有 Factory，会显示警告信息。

**Q: Alchemy 是否提供 Factory 地址？**
A: Alchemy 的 SDK 内部管理部署，不直接暴露 Factory 地址。如果您直接使用 EIP-4337（如本项目），建议自行部署或使用其他服务商的 Factory。

**Q: 可以暂时不配置 Factory 吗？**
A: 可以，如果账户已部署。但如果是新账户且未部署，不配置 Factory 会导致交易失败。

**Q: Factory 地址是否安全？**
A: 需要信任 Factory 合约的部署者。建议使用官方实现或自行部署。

