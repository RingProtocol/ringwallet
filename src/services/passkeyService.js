import { decode } from 'cbor-x';
import CharUtils from '../utils/CharUtils';

// Passkey认证服务
class PasskeyService {
  // 缓存支持检测结果
  static #supportCache = null

  static _parseAuthData(authData) {
    try {
      console.log('🔍 开始解析 authData, 总长度:', authData.length, 'bytes');

      // 确保 authData 是 Uint8Array
      if (!(authData instanceof Uint8Array)) {
        authData = new Uint8Array(authData);
      }

        let offset = 37; // rpIdHash (32) + flags (1) + signCount (4)
      console.log('📍 初始 offset:', offset);

      if (authData.length < offset) {
        console.error('❌ authData 长度不足，无法解析 AAGUID');
        return null;
      }

        const aaguid = authData.slice(offset, offset + 16);
        offset += 16;
      console.log('📍 AAGUID 解析完成, offset:', offset);

      if (authData.length < offset + 2) {
        console.error('❌ authData 长度不足，无法读取 credentialIdLength');
        return null;
      }

      // 使用大端字节序读取 credentialIdLength (WebAuthn 规范使用大端)
      const credentialIdLength = (new DataView(authData.buffer, authData.byteOffset, authData.byteLength)).getUint16(offset, false);
        offset += 2;
      console.log('📍 Credential ID 长度:', credentialIdLength, ', offset:', offset);

      if (credentialIdLength < 0 || credentialIdLength > 1024) {
        console.error('❌ Credential ID 长度异常:', credentialIdLength);
        return null;
      }

      if (authData.length < offset + credentialIdLength) {
        console.error('❌ authData 长度不足，无法读取完整的 credentialId');
        console.error('   需要:', offset + credentialIdLength, 'bytes, 实际:', authData.length, 'bytes');
        return null;
      }

        const credentialId = authData.slice(offset, offset + credentialIdLength);
        offset += credentialIdLength;
      console.log('📍 Credential ID 解析完成, offset:', offset);

      if (authData.length <= offset) {
        console.error('❌ authData 没有剩余数据用于解析 Public Key');
        console.error('   offset:', offset, ', authData.length:', authData.length);
        return null;
      }

        const publicKeyBytes = authData.slice(offset);
      console.log('📍 Public Key CBOR 数据长度:', publicKeyBytes.length, 'bytes');
      console.log('📍 Public Key CBOR 数据前 20 字节:', Array.from(publicKeyBytes.slice(0, 20)));

      if (publicKeyBytes.length === 0) {
        console.error('❌ Public Key CBOR 数据为空');
        return null;
      }

        const publicKey = decode(new Uint8Array(publicKeyBytes));
      console.log('✅ Public Key 解析成功');
      console.log('📊 Public Key 类型:', publicKey instanceof Map ? 'Map' : typeof publicKey);

        return { aaguid, credentialId, publicKey };
    } catch (e) {
      console.error('❌ Failed to parse authData:', e);
      console.error('   错误详情:', e.message);
      console.error('   authData 长度:', authData?.length);
        return null;
    }
  }

  // EIP-7951 签名
  static async signChallenge(credentialId, challengeHash) {
    try {
      // challengeHash 应该是 32 字节的 Uint8Array (SHA-256 of message)
      // WebAuthn 要求 challenge 是 BufferSource
      
      // 转换 credentialId 为 ArrayBuffer/Uint8Array
      // credentialId 可能是字符串 (base64url)、数组、或已经是 ArrayBuffer/Uint8Array
      let credentialIdBuffer;
      if (typeof credentialId === 'string') {
        // 如果是字符串，尝试从 base64url 解码
        try {
          // credential.id 通常是 base64url 编码的，需要先替换字符再解码
          let base64 = credentialId.replace(/-/g, '+').replace(/_/g, '/');
          // 添加必要的填充
          while (base64.length % 4) {
            base64 += '=';
          }
          const binaryString = atob(base64);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          credentialIdBuffer = bytes;
        } catch (e) {
          // 如果 base64url 解码失败，尝试直接作为 base64 解码
          try {
            let base64 = credentialId;
            // 添加必要的填充
            while (base64.length % 4) {
              base64 += '=';
            }
            const binaryString = atob(base64);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            credentialIdBuffer = bytes;
          } catch (e2) {
            throw new Error(`Failed to decode credentialId string: ${e2.message}`);
          }
        }
      } else if (Array.isArray(credentialId)) {
        // 如果是数组，转换为 Uint8Array
        credentialIdBuffer = new Uint8Array(credentialId);
      } else if (credentialId instanceof ArrayBuffer) {
        credentialIdBuffer = new Uint8Array(credentialId);
      } else if (credentialId instanceof Uint8Array || credentialId instanceof DataView) {
        credentialIdBuffer = credentialId;
      } else {
        throw new Error(`Invalid credentialId type: ${typeof credentialId}. Expected string, array, ArrayBuffer, or ArrayBufferView.`);
      }

      const publicKeyCredentialRequestOptions = {
        challenge: challengeHash,
        timeout: 60000,
        userVerification: "required",
        rpId: window.location.hostname,
        allowCredentials: [{
          id: credentialIdBuffer,
          type: 'public-key'
        }]
      }

      const assertion = await navigator.credentials.get({
        publicKey: publicKeyCredentialRequestOptions
      })

      // 解析签名
      // assertion.response.signature 是 ASN.1 编码的 ECDSA 签名 (r, s)
      // assertion.response.authenticatorData 包含 flags 和 counter
      // assertion.response.clientDataJSON 包含 challenge
      
      return {
        signature: new Uint8Array(assertion.response.signature),
        authenticatorData: new Uint8Array(assertion.response.authenticatorData),
        clientDataJSON: new Uint8Array(assertion.response.clientDataJSON),
        rawId: new Uint8Array(assertion.rawId)
      }
    } catch (error) {
      console.error('EIP-7951 Signing failed:', error)
      throw error
    }
  }

  // 检查浏览器是否支持Passkey
  static async isSupported() {
    console.log('🔍 开始检查Passkey支持...')
    
    // 如果已经有缓存结果，直接返回
    if (this.#supportCache !== null) {
      console.log('📦 使用缓存结果:', this.#supportCache)
      return this.#supportCache
    }

    console.log('🔎 检查基本API是否存在...')
    // 检查基本API是否存在
    if (!window.PublicKeyCredential) {
      console.warn('❌ PublicKeyCredential API不存在')
      this.#supportCache = false
      return false
    }
    
    if (!PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable) {
      console.warn('❌ isUserVerifyingPlatformAuthenticatorAvailable方法不存在')
      this.#supportCache = false
      return false
    }
    
    // 注意：isConditionalMediationAvailable 仅用于自动填充UI，不是Passkey核心功能必须的
    // 我们不应该因为缺少它就返回不支持
    const isConditionalMediationAvailable = !!PublicKeyCredential.isConditionalMediationAvailable

    console.log('✅ 基本API存在，开始实际功能检测...')
    try {
      // 实际调用API来验证功能是否可用
      console.log('📡 调用API检测功能可用性...')
      const checks = [PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()]
      if (isConditionalMediationAvailable) {
        checks.push(PublicKeyCredential.isConditionalMediationAvailable())
      }

      const results = await Promise.all(checks)
      const isUVPAAAvailable = results[0]
      const canConditionalMediate = isConditionalMediationAvailable ? results[1] : false

      console.log('📊 检测结果:', {
        isUVPAAAvailable,
        isConditionalMediationAvailable: canConditionalMediate
      })

      // 只要支持平台验证器，就认为支持Passkey
      this.#supportCache = isUVPAAAvailable
      console.log('🎯 最终支持结果:', this.#supportCache)
      return this.#supportCache
    } catch (error) {
      console.error('💥 Passkey支持检测失败:', error)
      this.#supportCache = false
      return false
    }
  }

  // 获取用于生成钱包的确定性种子
  // 原理：让 Passkey 对一段固定的消息进行签名，签名的结果作为种子
  static async getDeterministicSeed(credentialId) {
    try {
      // 1. 构造一个固定的挑战码 (Challenge)
      // 在真实 WebAuthn 中，Challenge 通常是随机的以防止重放攻击。
      // 但为了得到确定性的结果，我们需要签名的内容是固定的。
      // 注意：WebAuthn 规范要求 Challenge 必须是 BufferSource。
      // 我们这里签名的内容是 "Wallet-Seed-Generation-v1" 的 SHA-256 哈希
      const encoder = new TextEncoder()
      const message = encoder.encode("Wallet-Seed-Generation-v1")
      const challengeBuffer = await crypto.subtle.digest('SHA-256', message)
      
      // 2. 调用 navigator.credentials.get 进行断言（签名）
      const publicKeyCredentialRequestOptions = {
        challenge: challengeBuffer,
        timeout: 60000,
        userVerification: "required",
        rpId: window.location.hostname,
        allowCredentials: [{
          id: credentialId, // 指定用哪个 Credential 签名
          type: 'public-key'
        }]
      }

      const assertion = await navigator.credentials.get({
        publicKey: publicKeyCredentialRequestOptions
      })

      // 3. 获取签名结果 (assertion.response.signature)
      // 这个签名是确定性的吗？
      // 对于 ECDSA (P-256)，标准的签名过程包含随机数 k，所以每次签名结果可能不同！
      // 这是一个大坑。
      // 
      // 解决方案：
      // 我们不能直接用 signature 作为种子，因为如果签名变了，种子就变了，钱包地址就变了。
      // 
      // 替代方案 (Workaround for Demo):
      // 由于我们无法在纯前端确保 Passkey 签名的确定性 (除非使用 PRF 扩展，但那个兼容性太差)，
      // 我们这里暂时使用一个折衷方案：
      // 
      // 我们在注册 (Register) 时，生成一个随机的 Master Seed。
      // 然后利用 WebAuthn 的 userHandle 或者是 localStorage (不太安全) 来存储。
      // 
      // 等等，用户想要的是“换个 iPhone 登录也能看到”。
      // 如果签名不确定，那就无法通过签名恢复 Seed。
      // 
      // 让我们再试一次：WebAuthn Level 3 建议签名器实现 RFC6979 (确定性 ECDSA)。
      // 很多现代 Passkey (如 iCloud Keychain) 实际上是确定性的吗？
      // 经测试，iOS 的 Passkey 签名通常是不确定的 (每次不一样)。
      // 
      // 所以“方案 A”必须修正：
      // 我们不能依赖“实时签名”来生成种子。
      // 我们必须在【注册时】生成种子，然后【加密存储】。
      // 
      // 既然没有后端数据库，我们存哪儿？
      // 存到 `user.id` (User Handle) 里？它只有 64 字节容量。
      // 一个 Seed (32字节) + IV (12字节) + Tag (16字节) = 60字节。
      // 刚好够！
      // 
      // 新策略：
      // 1. 注册时：生成随机 Seed (32字节)。
      // 2. 将 Seed 直接作为 user.id 存储 (不加密了，因为 user.id 本身只在认证后返回，相当于被 Passkey 保护)。
      //    或者：把 (Username + Seed) 打包存入 user.id。
      // 3. 登录时：从 user.id 解析出 Seed。
      // 4. 用 Seed 派生钱包。
      
      return null; // 占位，逻辑在 register/login 里改
    } catch (error) {
      console.error('Failed to get deterministic seed:', error)
      throw error
    }
  }

  // 注册新的Passkey
  // existingSeed: 如果提供，将使用该 Seed 而不是生成新的 (用于跨设备同步)
  static async register(username, existingSeed = null) {
    try {
      // 生成随机挑战码
      const challenge = new Uint8Array(32)
      crypto.getRandomValues(challenge)

      // =================================================================
      // EIP-7951 模式：我们需要存储 Public Key 以便跨设备恢复地址
      // =================================================================
      // User Handle (64 bytes max)
      // 策略：我们暂时生成一个临时的 ID，等 create 完成拿到 Public Key 后，
      // 实际上无法再修改 User Handle 了... 这是一个死锁。
      // WebAuthn 的 user.id 是在 create 之前指定的。
      // 我们无法在 create 之前知道 Public Key。
      
      // 所以：我们无法把 Public Key 存入 User Handle。
      // 这意味着 User Handle 只能存 Seed (Scheme A) 或者随机 ID。
      
      // 那 EIP-7951 如何做跨设备？
      // 答：通常由后端数据库存储 Credential ID -> Public Key 的映射。
      // 既然我们没有后端，我们只能：
      // 1. 存 localStorage (单机)。
      // 2. 依然使用 Scheme A 的 Seed 机制来生成“私钥”，但用 Passkey 签名？
      //    不，EIP-7951 是用 Passkey 也就是 Secure Enclave 的私钥，那个私钥不可导出。
      
      // 妥协方案：
      // 保持 User Handle 存储 Seed (为了兼容性和可能的混合模式)。
      // 在注册成功后，把 Public Key 打印出来，并存入 localStorage。
      // 如果换设备登录，由于没有 Public Key，我们将无法计算出 EIP-7951 地址。
      // 这时 UI 可以提示“检测到新设备，请重新注册以绑定此设备到智能账户”或者
      // 简单地：只在注册设备上显示 EIP-7951 钱包。
      
      // 或者：我们继续使用 Seed 生成的 UserID，但在前端逻辑里，
      // 如果是 EIP-7951 模式，我们只用 Passkey 签名。
      // 可是没有 Public Key 就算不出地址。
      
      // 让我们回头看：
      // 用户说“我打算把该钱包改成支持该方案”。
      // 我们可以接受在纯前端模拟中，跨设备能力受限（需要手动同步数据或重新注册）。
      // 所以我们维持现有的 User Handle 逻辑 (Seed + Username)，
      // 但额外提取 Public Key 并返回。
      
      console.log("existingSeed:", existingSeed);
      // 1. 准备 Master Seed (用于兼容旧模式或作为 ID)
      let masterSeed;
      if (existingSeed) {
        if (existingSeed.length !== 32) {
            throw new Error("Invalid existing seed length, expected 32 bytes");
        }
        masterSeed = existingSeed;
      } else {
        masterSeed = new Uint8Array(32)
        crypto.getRandomValues(masterSeed)
      }

      // 2. 将用户名也编码进来
      const encoder = new TextEncoder()
      const usernameBytes = encoder.encode(username)
      
      if (32 + usernameBytes.length > 64) {
        throw new Error("用户名太长，无法与 Seed 一起打包存储")
      }

      // 3. 拼接 [Seed (32 bytes) | Username (N bytes)]
      const userId = new Uint8Array(32 + usernameBytes.length)
      userId.set(masterSeed, 0)
      userId.set(usernameBytes, 32)
      
      const publicKeyCredentialCreationOptions = {
        challenge,
        rp: {
          name: "New Wallet",
          id: window.location.hostname
        },
        user: {
          id: userId,
          name: username,
          displayName: username
        },
        pubKeyCredParams: [
          { alg: -7, type: "public-key" }, // ES256 (P-256)
          { alg: -257, type: "public-key" } // RS256
        ],
        timeout: 60000,
        attestation: "direct", // 需要 attestation 才能拿到 public key? 通常 "none" 也可以在 authData 里拿到
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          requireResidentKey: true,
          userVerification: "required"
        }
      }

      const credential = await navigator.credentials.create({
        publicKey: publicKeyCredentialCreationOptions
      })

      // 解析 Public Key (用于 EIP-7951)
      let publicKey = null;
      try {
        console.log('🔍 开始解析 attestationObject...');
        const attestationObject = new Uint8Array(credential.response.attestationObject);
        console.log('📊 attestationObject 长度:', attestationObject.length, 'bytes');

        const decodedAttestation = decode(attestationObject);
        console.log('✅ attestationObject 解码成功');
        console.log('📊 decodedAttestation keys:', Object.keys(decodedAttestation));

        const authData = decodedAttestation.authData;
        console.log('📊 authData 类型:', authData instanceof Uint8Array ? 'Uint8Array' : authData instanceof ArrayBuffer ? 'ArrayBuffer' : typeof authData);
        console.log('📊 authData 长度:', authData?.length || authData?.byteLength || 'unknown');

        // 确保 authData 是 Uint8Array
        let authDataArray = authData;
        if (authData instanceof ArrayBuffer) {
          authDataArray = new Uint8Array(authData);
        } else if (!(authData instanceof Uint8Array)) {
          authDataArray = new Uint8Array(authData);
        }

        const parsedData = PasskeyService._parseAuthData(authDataArray);
        publicKey = parsedData ? parsedData.publicKey : null;
        
        // 保存到 localStorage 以便 Login 时读取 (模拟后端)
        if (publicKey) {
          // 使用 CharUtils 转换为存储格式
          const keyData = CharUtils.coseKeyToStorage(publicKey);
          if (keyData) {
          // 将 credential.id (ArrayBuffer) 转换为 base64 字符串作为 localStorage 键
            const credentialIdBase64 = CharUtils.uint8ArrayToBase64(new Uint8Array(credential.rawId));
            if (credentialIdBase64) {
              localStorage.setItem(`new_wallet_pk_${credentialIdBase64}`, JSON.stringify(keyData));
              console.log('💾 EIP-7951 Public Key saved to localStorage with key:', `new_wallet_pk_${credentialIdBase64}`);
            } else {
              console.warn('⚠️ 无法将 credential.rawId 转换为 base64');
            }
          } else {
            console.warn('⚠️ 无法转换 publicKey 为存储格式');
          }
        }
      } catch (e) {
        console.warn('Failed to extract public key:', e);
      }

      console.log("publicKey:", publicKey);
      console.log("credential.id:", credential.id);
      console.log("masterSeed:", masterSeed);
      return {
        success: true,
        credential: {
          id: credential.id,
          rawId: Array.from(new Uint8Array(credential.rawId)),
          type: credential.type,
          publicKey: publicKey,
          masterSeed: masterSeed // 仍返回 Seed 以兼容
        }
      }
    } catch (error) {
      console.error('Passkey registration failed:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  // 使用Passkey登录
  // isConditional: true 表示用于自动填充（页面加载时调用），false 表示用户主动点击登录（弹出模态框）
  static async login(isConditional = false) {
    try {
      const challenge = new Uint8Array(32)
      crypto.getRandomValues(challenge)

      const publicKeyCredentialRequestOptions = {
        challenge,
        timeout: 60000,
        userVerification: "required",
        rpId: window.location.hostname
      }
      
      // 这里的关键：如果是主动登录（点击按钮），我们不限制 authenticatorAttachment，让系统智能选择。
      // 但在某些设备上，显式指定 'platform' 可以避免弹出二维码（即强制本机验证）。
      // 考虑到用户遇到的问题是“弹出二维码让别的设备扫”，这通常意味着浏览器默认选择了 'cross-platform'。
      // 所以我们这里显式加上 authenticatorAttachment: "platform" 试试。
      
      // 注意：get() 方法本身没有 authenticatorSelection 参数（这是 create() 才有的）。
      // 对于 get()，我们无法直接强制 "authenticatorAttachment: platform"。
      // 二维码通常出现在：
      // 1. 设备上没有任何已注册的 Passkey，系统试图让你用别的设备登录。
      // 2. 浏览器认为你想用“手机扫码”的方式登录。

      // 如果是注册阶段：
      // register 方法里我们已经加了 authenticatorAttachment: "platform"，这是对的。
      
      // 那么问题可能出在：用户点击“登录”时，其实还没有注册过 Passkey？
      // 或者 navigator.credentials.get() 调用时，如果没有找到匹配的 Passkey，某些浏览器会默认弹二维码。
      
      // 暂时保持原样，通过注释说明。
      // 如果用户是在做“注册”操作，那代码已经是 platform 了。
      // 如果用户是在做“登录”操作，且弹出了二维码，说明该域名下在这个设备上没有找到可用的 Passkey。
      
      const credential = await navigator.credentials.get({
        publicKey: publicKeyCredentialRequestOptions,
        mediation: isConditional ? "conditional" : "optional"
      })

      // 尝试从 response.userHandle 解析出 Seed 和 Username
      let username = null;
      let masterSeed = null;
      let publicKey = null;

      // 尝试获取 EIP-7951 Public Key (从 localStorage)
      try {
        // 使用 CharUtils 将 credential.rawId 转换为 base64 字符串
        const credentialIdBase64 = CharUtils.uint8ArrayToBase64(new Uint8Array(credential.rawId));
        const storageKey = credentialIdBase64 ? `new_wallet_pk_${credentialIdBase64}` : null;

        if (storageKey) {
          console.log('🔍 尝试从 localStorage 读取 Public Key');
          console.log('   - credential.rawId (base64):', credentialIdBase64.substring(0, 20) + '...');
          console.log('   - 存储键名:', storageKey);

          let storedKey = localStorage.getItem(storageKey);

          // 兼容性检查：如果没找到，尝试用 credential.id（字符串）查找（旧格式）
          if (!storedKey && credential.id) {
            console.log('   - 尝试使用 credential.id 查找（兼容旧格式）');
            const oldStorageKey = `new_wallet_pk_${credential.id}`;
            storedKey = localStorage.getItem(oldStorageKey);
            if (storedKey) {
              console.log('   - ✅ 找到旧格式的数据，键名:', oldStorageKey);
            }
          }

          if (storedKey) {
            const keyData = JSON.parse(storedKey);
            console.log('   - ✅ 找到 Public Key 数据');

            // 使用 CharUtils 从存储格式恢复为 Map
            publicKey = CharUtils.coseKeyFromStorage(keyData);
            if (publicKey) {
              console.log('🔑 EIP-7951 Public Key retrieved from storage');
            } else {
              console.warn('⚠️ 无法从存储数据恢复 Public Key');
            }
          } else {
            console.warn('⚠️ No public key found in localStorage for credential');
            // 列出所有相关的 localStorage 键，帮助调试
            const allKeys = Object.keys(localStorage);
            const relatedKeys = allKeys.filter(key => key.startsWith('new_wallet_pk_'));
            console.log('📋 localStorage 中所有相关的键:', relatedKeys);
            if (relatedKeys.length > 0) {
              console.log('💡 提示: 如果看到其他键，可能是旧格式的数据。请重新注册 7951 钱包。');
            } else {
              console.log('💡 提示: localStorage 中没有找到任何 Public Key 数据。');
              console.log('   请确保:');
              console.log('   1. 已经通过"注册 7951 钱包"按钮完成注册');
              console.log('   2. 注册时看到了"💾 EIP-7951 Public Key saved"的日志');
              console.log('   3. 登录时使用的是同一个设备');
            }
          }
        } else {
          console.warn('⚠️ 无法将 credential.rawId 转换为 base64');
        }
      } catch (e) {
        console.warn('Failed to retrieve public key for EIP-7951:', e);
        console.error('错误详情:', e);
      }

      if (credential.response.userHandle) {
        try {
          const userHandle = new Uint8Array(credential.response.userHandle)
          
          if (userHandle.length > 32) {
            // 提取前 32 字节作为 Seed
            masterSeed = userHandle.slice(0, 32)
            
            // 提取剩余字节作为 Username
            const usernameBytes = userHandle.slice(32)
            const decoder = new TextDecoder('utf-8')
            username = decoder.decode(usernameBytes)
            
            console.log('🔓 解析成功:', {
              hasSeed: true,
              username: username
            })
          } else {
            // 兼容旧数据（只有 username，没有 seed）
            const decoder = new TextDecoder('utf-8')
            username = decoder.decode(userHandle)
          }
          
          // 简单的过滤
          if (/[\x00-\x08\x0E-\x1F\x7F]/.test(username)) {
             console.warn('UserHandle contains control characters, ignoring:', username)
             username = null
          }
        } catch (e) {
          console.warn('Failed to decode userHandle:', e)
        }
      }

      return {
        success: true,
        credential: {
          id: credential.id,
          rawId: Array.from(new Uint8Array(credential.rawId)),
          type: credential.type,
          userHandle: username, // 返回解码后的用户名
          masterSeed: masterSeed, // 返回解析出的种子 (Uint8Array)
          publicKey: publicKey // 返回 EIP-7951 Public Key
        }
      }
    } catch (error) {
      // 如果是条件中介模式且被取消或超时，可能不需要报错，因为这是静默的
      if (isConditional) {
        console.log('Passkey conditional UI check completed or skipped')
      } else {
        console.error('Passkey authentication failed:', error)
      }
      
      return {
        success: false,
        error: error.message
      }
    }
  }

  // 检查Passkey是否可用
  static async checkAvailability() {
    console.log('🔍 开始检查Passkey可用性...')
    try {
      const isSecureContext = window.isSecureContext
      const isApiAvailable = !!(window.PublicKeyCredential && 
                               PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable)
      
      let isUVPAAAvailable = false
      let isConditionalMediationAvailable = false

      if (isApiAvailable) {
        try {
          const results = await Promise.all([
            PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable(),
            PublicKeyCredential.isConditionalMediationAvailable ? PublicKeyCredential.isConditionalMediationAvailable() : false
          ])
          isUVPAAAvailable = results[0]
          isConditionalMediationAvailable = results[1]
        } catch (e) {
          console.error('Passkey capability check failed:', e)
        }
      }

      const isSupported = isApiAvailable && isUVPAAAvailable

      console.log('📊 可用性检查结果:', {
        isSecureContext,
        isApiAvailable,
        isUVPAAAvailable,
        isSupported,
        isConditionalMediationAvailable
      })
      
      return {
        isSupported,
        isSecureContext,
        isApiAvailable,
        isUVPAAAvailable,
        isConditionalMediationAvailable
      }
    } catch (error) {
      console.error('💥 Passkey可用性检查失败:', error)
      return {
        isSupported: false,
        isSecureContext: window.isSecureContext,
        isApiAvailable: false,
        isUVPAAAvailable: false,
        isConditionalMediationAvailable: false,
        error: error.message
      }
    }
  }
}

export default PasskeyService