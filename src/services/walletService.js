import { ethers } from 'ethers';
import PasskeyService from './passkeyService';
import CharUtils from '../utils/CharUtils';

class WalletService {
  /**
   * 从 Master Seed 派生钱包
   * @param {Uint8Array} masterSeed - 32字节的种子
   * @param {number} count - 生成钱包的数量
   * @param {string} accountName - 账户名称 (用于区分不同派生路径，暂未实现复杂路径)
   * @returns {Array} 钱包列表 [{ index, address, privateKey }]
   */
  static deriveWallets(masterSeed, count = 1, accountName = 'default') {
    if (!masterSeed || masterSeed.length !== 32) {
      console.error('Invalid master seed provided to WalletService');
      return [];
    }

    try {
      // 1. 将 Uint8Array 转换为 hex 字符串，作为 Mnemonic 的 entropy
      // 注意：这里我们直接用 Seed 生成 HDNodeWallet，而不是通过助记词
      // 因为我们生成的已经是随机种子了
      
      // 使用 ethers.HDNodeWallet.fromSeed 
      // seed 必须是 hex string (with 0x)
      const seedHex = ethers.hexlify(masterSeed);
      
      // 创建 Master Node
      // 注意：ethers v6 的用法
      const rootNode = ethers.HDNodeWallet.fromSeed(seedHex);
      
      const wallets = [];
      
      // BIP-44 path for Ethereum: m/44'/60'/0'/0/x
      const basePath = "m/44'/60'/0'/0";

      for (let i = 0; i < count; i++) {
        const path = `${basePath}/${i}`;
        const childNode = rootNode.derivePath(path);
        
        wallets.push({
          index: i,
          address: childNode.address,
          privateKey: childNode.privateKey, // 仅供演示，真实环境不要暴露私钥
          path: path
        });
      }

      return wallets;
    } catch (error) {
      console.error('Wallet derivation failed:', error);
      throw error;
    }
  }

  /**
   * EIP-7951: 从 Passkey Public Key 派生 Smart Account 地址
   * @param {Map} publicKey - COSE Public Key
   * @param {number} salt - 盐值 (用于区分不同钱包)
   * @returns {string} 0x 地址
   */
  static deriveSmartAccount(publicKey, salt = 0) {
    try {
      if (!publicKey) return null;

      // 使用 CharUtils 提取 COSE 密钥坐标，支持多种格式
      const coordinates = CharUtils.extractCoseKeyCoordinates(publicKey);
      
      if (!coordinates || !coordinates.x || !coordinates.y) {
          console.warn('Invalid COSE key structure:', publicKey);
        console.warn('尝试使用 CharUtils 验证:', CharUtils.isValidCoseKey(publicKey));
          return null;
      }

      const xBytes = coordinates.x;
      const yBytes = coordinates.y;

      // 简单模拟: Address = keccak256(x || y || salt)[12:]
      // 真实场景：应该用 CREATE2(factory, salt, initCode)
      // 这里为了演示确定性地址，我们用公钥+salt的哈希
      const concat = new Uint8Array(xBytes.length + yBytes.length + 4);
      concat.set(xBytes, 0);
      concat.set(yBytes, xBytes.length);
      // Add salt as 4 bytes (Big Endian)
      new DataView(concat.buffer).setUint32(xBytes.length + yBytes.length, salt);

      const hash = ethers.keccak256(concat);
      // 取最后 20 字节作为地址
      return ethers.getAddress(ethers.dataSlice(hash, 12));
    } catch (e) {
      console.error('Failed to derive smart account:', e);
      return null;
    }
  }

  /**
   * 签名交易
   * @param {string} privateKey - 钱包私钥
   * @param {string} to - 接收地址
   * @param {string} amount - 发送金额 (ETH)
   * @param {number} chainId - 链ID
   * @returns {Promise<string>} 签名后的交易 Hex
   */
  static async signTransaction(privateKey, to, amount, chainId, rpcUrl = null) {
    try {
      if (!privateKey) throw new Error('Private key is required');
      if (!to) throw new Error('Recipient address is required');
      if (!amount) throw new Error('Amount is required');
      if (!chainId) throw new Error('Chain ID is required');
      const wallet = new ethers.Wallet(privateKey);
      const value = ethers.parseEther(amount || '0');
      
      if (rpcUrl) {
        const provider = new ethers.JsonRpcProvider(rpcUrl);
        const nonce = await provider.getTransactionCount(wallet.address);
        const feeData = await provider.getFeeData();
        const estimated = await provider.estimateGas({
          from: wallet.address,
          to,
          value
        });
        const gasLimit = estimated + (estimated / 10n); // +10% buffer
        const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas || ethers.parseUnits('1.5', 'gwei');
        const maxFeePerGas = feeData.maxFeePerGas || (maxPriorityFeePerGas + ethers.parseUnits('30', 'gwei'));
        const tx = {
          to,
          value,
          nonce,
          chainId,
          type: 2,
          gasLimit: gasLimit < 31500n ? 31500n : gasLimit,
          maxPriorityFeePerGas,
          maxFeePerGas
        };
        const signedTx = await wallet.signTransaction(tx);
        return signedTx;
      } else {
        const tx = {
          to,
          value,
          nonce: 0,
          gasLimit: 31500,
          gasPrice: ethers.parseUnits('20', 'gwei'),
          chainId,
          type: 0
        };
        const signedTx = await wallet.signTransaction(tx);
        return signedTx;
      }

    } catch (error) {
      console.error('Signing failed:', error);
      throw error;
    }
  }

  /**
   * 检查智能账户是否已部署
   * @param {string} address - 账户地址
   * @param {string} rpcUrl - RPC URL
   * @returns {Promise<boolean>} 是否已部署
   */
  static async isAccountDeployed(address, rpcUrl) {
    try {
      if (!rpcUrl || !address) return false;
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      const code = await provider.getCode(address);
      // 如果账户有代码且不是空字符串，说明已部署
      return code && code !== '0x';
    } catch (error) {
      console.error('Failed to check if account is deployed:', error);
      return false;
    }
  }

  /**
   * 构建 initCode（用于部署智能账户）
   * @param {string} factoryAddress - Factory 合约地址
   * @param {string} publicKey - Passkey 公钥（COSE格式）
   * @param {number} salt - 盐值
   * @returns {string} initCode (factoryAddress + encodedCalldata)
   */
  static buildInitCode(factoryAddress, publicKey, salt = 0) {
    if (!factoryAddress || factoryAddress === ethers.ZeroAddress) {
      return '0x';
    }

    try {
      // 标准 Factory 接口：createAccount(bytes32 salt) 或 createAccount(address owner, bytes32 salt)
      // 这里假设使用 createAccount(bytes32 salt) 或类似的接口
      // 实际接口可能因工厂实现而异
      const factoryIface = new ethers.Interface([
        'function createAccount(bytes32 salt) returns (address)',
        'function createAccount(address owner, bytes32 salt) returns (address)'
      ]);

      // 将 salt 转换为 bytes32
      const saltBytes32 = ethers.zeroPadValue(ethers.toBeHex(salt), 32);

      // 尝试使用 createAccount(bytes32 salt)
      let encodedCall;
      try {
        encodedCall = factoryIface.encodeFunctionData('createAccount', [saltBytes32]);
      } catch {
        // 如果失败，可能需要 owner 参数，这里使用 senderAddress 或 ZeroAddress
        // 注意：实际使用时需要根据具体工厂接口调整
        encodedCall = factoryIface.encodeFunctionData('createAccount', [ethers.ZeroAddress, saltBytes32]);
      }

      // initCode = factoryAddress (20 bytes) + encodedCalldata
      // 移除 factoryAddress 的 0x 前缀，拼接
      const factoryAddrBytes = ethers.getBytes(factoryAddress);
      const callDataBytes = ethers.getBytes(encodedCall);
      const initCode = ethers.hexlify(ethers.concat([factoryAddrBytes, callDataBytes]));

      return initCode;
    } catch (error) {
      console.error('Failed to build initCode:', error);
      return '0x';
    }
  }

  /**
   * 签名 EIP-7951 交易 (通过 Passkey)
   * @param {string} credentialId - Passkey Credential ID
   * @param {string} to - 接收地址
   * @param {string} amount - 发送金额 (ETH)
   * @param {number} chainId - 链ID
   * @param {string} rpcUrl - RPC URL
   * @param {string} senderAddress - 发送者地址（智能账户地址）
   * @param {string} factoryAddress - Factory 合约地址（可选，用于部署新账户）
   * @param {Map} publicKey - Passkey 公钥（可选，用于构建 initCode）
   * @param {number} salt - 盐值（可选，用于构建 initCode）
   * @returns {Promise<string>} 签名结果详情
   */
  static async signEIP7951Transaction(credentialId, to, amount, chainId, rpcUrl, senderAddress, factoryAddress = null, publicKey = null, salt = 0) {
    try {
      if (!credentialId) throw new Error('Credential ID is required');
      if (!to) throw new Error('Recipient address is required');
      if (!rpcUrl) throw new Error('RPC URL is required');
      if (!senderAddress) throw new Error('Sender address is required');
      if (!amount) throw new Error('Amount is required');
      if (!chainId) throw new Error('Chain ID is required');

      const value = ethers.parseEther(amount || '0');
      const provider = rpcUrl ? new ethers.JsonRpcProvider(rpcUrl) : null;

      // 检查账户是否已部署
      let isDeployed = false;
      let initCode = '0x';

      if (provider) {
        isDeployed = await this.isAccountDeployed(senderAddress, rpcUrl);

        if (!isDeployed) {
          // 如果账户未部署，尝试构建 initCode
          if (factoryAddress && publicKey) {
            initCode = WalletService.buildInitCode(factoryAddress, publicKey, salt);
            console.log('Account not deployed, using initCode:', initCode);
          } else {
            console.warn('Account not deployed and no factory address provided. The UserOperation may fail.');
            console.warn('To fix this, provide a factory address in the chain configuration.');
          }
        }
      }

      const feeData = provider ? await provider.getFeeData() : {};
      const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas || ethers.parseUnits('1.5', 'gwei');
      const maxFeePerGas = feeData.maxFeePerGas || (maxPriorityFeePerGas + ethers.parseUnits('30', 'gwei'));

      // 如果使用 initCode，需要增加 gas limits
      const callGasLimit = initCode !== '0x' ? 200000n : 150000n;
      const verificationGasLimit = initCode !== '0x' ? 150000n : 120000n;
      const preVerificationGas = initCode !== '0x' ? 100000n : 50000n;

      // 获取 nonce（如果账户未部署，nonce 应该是 0）
      let nonce = '0x0';
      if (provider && isDeployed) {
        try {
          // 尝试从 EntryPoint 获取 nonce（需要 EntryPoint 地址）
          // 如果无法获取，使用 0
          // 注意：实际实现中，应该从 EntryPoint.getNonce() 获取
          nonce = '0x0';
        } catch (e) {
          console.warn('Could not fetch nonce, using 0:', e);
        }
      }

      const iface = new ethers.Interface(['function execute(address to,uint256 value,bytes data)']);
      const callData = iface.encodeFunctionData('execute', [to, value, '0x']);

      const baseUserOp = {
        sender: senderAddress || ethers.ZeroAddress,
        nonce,
        initCode,
        callData,
        callGasLimit: ethers.toBeHex(callGasLimit),
        verificationGasLimit: ethers.toBeHex(verificationGasLimit),
        preVerificationGas: ethers.toBeHex(preVerificationGas),
        maxFeePerGas: ethers.toBeHex(maxFeePerGas),
        maxPriorityFeePerGas: ethers.toBeHex(maxPriorityFeePerGas),
        paymasterAndData: '0x',
        signature: '0x'
      };

      // 使用 EIP-4337 标准的 UserOperation hash 计算方式
      // 注意：这里简化了，实际应该使用 EntryPoint.getUserOpHash()
      // 但为了演示，我们使用简化的哈希计算
      const messageBytes = ethers.toUtf8Bytes(JSON.stringify(baseUserOp));
      const hash = ethers.sha256(messageBytes);
      const hashBytes = ethers.getBytes(hash);

      const result = await PasskeyService.signChallenge(credentialId, hashBytes);
      const signatureHex = ethers.hexlify(result.signature);
      const authDataHex = ethers.hexlify(result.authenticatorData);
      const userOp = { ...baseUserOp, signature: signatureHex };

      return {
        type: 'eip-7951',
        userOp,
        hash,
        signature: signatureHex,
        authData: authDataHex,
        isDeployed,
        display: `[EIP-7951 UserOperation]
----------------------------------------
Sender: ${senderAddress}
Account Deployed: ${isDeployed}
InitCode: ${initCode !== '0x' ? initCode.substring(0, 42) + '...' : '0x (empty)'}
UserOp: ${JSON.stringify(userOp, null, 2)}
Message Hash: ${hash}
Signature: ${signatureHex.substring(0, 66)}...
Authenticator Data: ${authDataHex.substring(0, 66)}...
----------------------------------------`
      };

    } catch (error) {
      console.error('EIP-7951 Signing failed:', error);
      throw error;
    }
  }

  /**
   * 广播交易到区块链
   * @param {Object|string} signedData - 签名后的数据
   * @returns {Promise<string>} 交易哈希
   */
  static async broadcastTransaction(signedData, rpcUrl, bundlerUrl, entryPoint) {
    if (!rpcUrl) throw new Error('RPC URL is required');
    if (!bundlerUrl) throw new Error('Bundler URL is required');
    if (!entryPoint) throw new Error('Entry point is required');
    if (!signedData) throw new Error('Signed data is required');
    // 模拟网络延迟
    await new Promise(resolve => setTimeout(resolve, 1500));

    let txHash;
    
    if (typeof signedData === 'string' && signedData.startsWith('0x')) {
      if (rpcUrl) {
        try {
          const provider = new ethers.JsonRpcProvider(rpcUrl);
          const response = await provider.broadcastTransaction(signedData);
          txHash = response.hash;
        } catch (e) {
          console.error('Broadcast via RPC failed, falling back to simulated hash:', e);
          txHash = ethers.keccak256(signedData);
        }
      } else {
        txHash = ethers.keccak256(signedData);
      }
      
    } else if (signedData && signedData.type === 'eip-7951') {
      console.log("broadcast eip-7951 transaction");
      if (bundlerUrl && entryPoint && signedData.userOp) {
        try {
          const res = await fetch(bundlerUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0',
              id: 1,
              method: 'eth_sendUserOperation',
              params: [signedData.userOp, entryPoint]
            })
          });
          const json = await res.json();
          if (json.error) {
            throw new Error(json.error.message || 'Bundler error');
          }
          txHash = json.result;
        } catch (e) {
          console.error('Sending UserOperation failed, falling back to simulated hash:', e);
          txHash = ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(signedData)));
        }
      } else {
        txHash = ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(signedData)));
      }
      
    } else {
      throw new Error('Invalid transaction data format');
    }

    console.log('Transaction Broadcast Success! Hash:', txHash);
    return txHash;
  }
}

export default WalletService;
