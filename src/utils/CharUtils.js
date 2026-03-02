/**
 * CharUtils - 字符和数组转换工具类
 * 用于处理各种数据格式之间的转换，特别是 WebAuthn/COSE 相关的数据格式
 */
class CharUtils {
  /**
   * 将 Uint8Array 转换为普通数组
   * @param {Uint8Array|ArrayBuffer|Array} data - 输入数据
   * @returns {Array<number>} 数字数组
   */
  static uint8ArrayToArray(data) {
    if (!data) return null;
    if (Array.isArray(data)) return data;
    if (data instanceof Uint8Array) return Array.from(data);
    if (data instanceof ArrayBuffer) return Array.from(new Uint8Array(data));
    if (data instanceof DataView) {
      const arr = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
      return Array.from(arr);
    }
    // 尝试直接转换
    try {
      return Array.from(new Uint8Array(data));
    } catch (e) {
      console.warn('CharUtils.uint8ArrayToArray: 无法转换数据', e);
      return null;
    }
  }

  /**
   * 将数组转换为 Uint8Array
   * @param {Array<number>|Uint8Array|ArrayBuffer|Object} data - 输入数据
   * @returns {Uint8Array} Uint8Array
   */
  static arrayToUint8Array(data) {
    if (!data) return null;
    if (data instanceof Uint8Array) return data;
    if (data instanceof ArrayBuffer) return new Uint8Array(data);
    if (Array.isArray(data)) {
      // 确保数组中的所有元素都是数字
      const numbers = data.map(v => typeof v === 'number' ? v : Number(v));
      return new Uint8Array(numbers);
    }
    // 尝试从对象值创建（兼容从 JSON 恢复的情况，如 {0: 1, 1: 2, ...}）
    if (typeof data === 'object' && data.constructor === Object) {
      try {
        // 如果对象的键是数字索引，转换为数组
        const keys = Object.keys(data).map(k => parseInt(k, 10)).filter(k => !isNaN(k));
        if (keys.length > 0) {
          const maxKey = Math.max(...keys);
          const arr = new Array(maxKey + 1);
          for (const key of keys) {
            arr[key] = typeof data[key] === 'number' ? data[key] : Number(data[key]);
          }
          return new Uint8Array(arr);
        }
        // 否则尝试直接使用 Object.values
        return new Uint8Array(Object.values(data).map(v => typeof v === 'number' ? v : Number(v)));
      } catch (e) {
        console.warn('CharUtils.arrayToUint8Array: 无法从对象创建', e, data);
        return null;
      }
    }
    return null;
  }

  /**
   * 将 Uint8Array 转换为 Base64 字符串
   * @param {Uint8Array|ArrayBuffer|Array<number>} data - 输入数据
   * @returns {string} Base64 字符串
   */
  static uint8ArrayToBase64(data) {
    if (!data) return null;
    const arr = this.arrayToUint8Array(data);
    if (!arr) return null;
    // 使用 btoa
    const binary = String.fromCharCode(...arr);
    return btoa(binary);
  }

  /**
   * 将 Base64 字符串转换为 Uint8Array
   * @param {string} base64 - Base64 字符串
   * @returns {Uint8Array} Uint8Array
   */
  static base64ToUint8Array(base64) {
    if (!base64 || typeof base64 !== 'string') return null;
    try {
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return bytes;
    } catch (e) {
      console.warn('CharUtils.base64ToUint8Array: Base64 解码失败', e);
      return null;
    }
  }

  /**
   * 将 Uint8Array 转换为 Base64URL 字符串（用于 WebAuthn）
   * @param {Uint8Array|ArrayBuffer|Array<number>} data - 输入数据
   * @returns {string} Base64URL 字符串
   */
  static uint8ArrayToBase64URL(data) {
    const base64 = this.uint8ArrayToBase64(data);
    if (!base64) return null;
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }

  /**
   * 将 Base64URL 字符串转换为 Uint8Array
   * @param {string} base64url - Base64URL 字符串
   * @returns {Uint8Array} Uint8Array
   */
  static base64URLToUint8Array(base64url) {
    if (!base64url || typeof base64url !== 'string') return null;
    try {
      // 转换为标准 Base64
      let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
      // 添加填充
      while (base64.length % 4) {
        base64 += '=';
      }
      return this.base64ToUint8Array(base64);
    } catch (e) {
      console.warn('CharUtils.base64URLToUint8Array: Base64URL 解码失败', e);
      return null;
    }
  }

  /**
   * 将 Uint8Array 转换为十六进制字符串（带 0x 前缀）
   * @param {Uint8Array|ArrayBuffer|Array<number>} data - 输入数据
   * @param {boolean} prefix - 是否添加 0x 前缀，默认为 true
   * @returns {string} 十六进制字符串
   */
  static uint8ArrayToHex(data, prefix = true) {
    const arr = this.arrayToUint8Array(data);
    if (!arr) return null;
    const hex = Array.from(arr)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    return prefix ? '0x' + hex : hex;
  }

  /**
   * 将十六进制字符串转换为 Uint8Array
   * @param {string} hex - 十六进制字符串（可带或不带 0x 前缀）
   * @returns {Uint8Array} Uint8Array
   */
  static hexToUint8Array(hex) {
    if (!hex || typeof hex !== 'string') return null;
    // 移除 0x 前缀
    const cleanHex = hex.startsWith('0x') || hex.startsWith('0X') ? hex.slice(2) : hex;
    if (cleanHex.length % 2 !== 0) {
      console.warn('CharUtils.hexToUint8Array: 十六进制字符串长度必须是偶数');
      return null;
    }
    const bytes = new Uint8Array(cleanHex.length / 2);
    for (let i = 0; i < cleanHex.length; i += 2) {
      bytes[i / 2] = parseInt(cleanHex.substr(i, 2), 16);
    }
    return bytes;
  }

  /**
   * 将字符串转换为 Uint8Array（UTF-8 编码）
   * @param {string} str - 输入字符串
   * @returns {Uint8Array} Uint8Array
   */
  static stringToUint8Array(str) {
    if (!str || typeof str !== 'string') return null;
    const encoder = new TextEncoder();
    return encoder.encode(str);
  }

  /**
   * 将 Uint8Array 转换为字符串（UTF-8 解码）
   * @param {Uint8Array|ArrayBuffer|Array<number>} data - 输入数据
   * @returns {string} 字符串
   */
  static uint8ArrayToString(data) {
    const arr = this.arrayToUint8Array(data);
    if (!arr) return null;
    const decoder = new TextDecoder('utf-8');
    return decoder.decode(arr);
  }

  /**
   * COSE 公钥：从 Map 格式转换为可序列化的对象格式（用于存储）
   * @param {Map|Object} coseKey - COSE 公钥（Map 或对象，键为 -2, -3）
   * @returns {Object|null} 可序列化的对象 {_type: 'Map', x: Array, y: Array}
   */
  static coseKeyToStorage(coseKey) {
    if (!coseKey) {
      console.warn('CharUtils.coseKeyToStorage: coseKey 为空');
      return null;
    }

    let x, y;
    
    // 从 Map 或对象中提取 x 和 y
    if (coseKey instanceof Map) {
      x = coseKey.get(-2);
      y = coseKey.get(-3);
      if (!x || !y) {
        console.warn('CharUtils.coseKeyToStorage: Map 中缺少 -2 或 -3 键', {
          hasMinus2: coseKey.has(-2),
          hasMinus3: coseKey.has(-3)
        });
      }
    } else if (typeof coseKey === 'object' && coseKey !== null) {
      // 尝试多种方式获取
      x = coseKey[-2] !== undefined ? coseKey[-2] : (coseKey.get?.(-2));
      y = coseKey[-3] !== undefined ? coseKey[-3] : (coseKey.get?.(-3));
      
      if (!x || !y) {
        console.warn('CharUtils.coseKeyToStorage: 对象中缺少 -2 或 -3 键', {
          hasMinus2: -2 in coseKey,
          hasMinus3: -3 in coseKey,
          hasGet: typeof coseKey.get === 'function',
          keys: Object.keys(coseKey)
        });
      }
    } else {
      console.warn('CharUtils.coseKeyToStorage: 无效的 COSE 密钥格式', typeof coseKey);
      return null;
    }

    if (!x || !y) {
      console.warn('CharUtils.coseKeyToStorage: COSE 密钥缺少 x 或 y 坐标', {
        hasX: !!x,
        hasY: !!y,
        xType: typeof x,
        yType: typeof y
      });
      return null;
    }

    // 转换为数组格式以便 JSON 序列化
    const xArray = this.uint8ArrayToArray(x);
    const yArray = this.uint8ArrayToArray(y);

    if (!xArray || !yArray) {
      console.warn('CharUtils.coseKeyToStorage: 无法转换 x 或 y 坐标为数组', {
        xType: typeof x,
        xIsUint8Array: x instanceof Uint8Array,
        yType: typeof y,
        yIsUint8Array: y instanceof Uint8Array
      });
      return null;
    }

    // 确保是普通数组（不是类数组对象）
    const result = {
      _type: 'Map',
      x: Array.isArray(xArray) ? xArray : Array.from(xArray),
      y: Array.isArray(yArray) ? yArray : Array.from(yArray)
    };

    console.log('CharUtils.coseKeyToStorage: 成功转换 COSE 密钥', {
      xLength: result.x.length,
      yLength: result.y.length
    });

    return result;
  }

  /**
   * COSE 公钥：从存储格式恢复为 Map 格式（用于运行时）
   * @param {Object|Map} storageData - 存储的数据（对象格式 {_type: 'Map', x: Array, y: Array} 或 Map）
   * @returns {Map|null} COSE 公钥 Map
   */
  static coseKeyFromStorage(storageData) {
    if (!storageData) {
      console.warn('CharUtils.coseKeyFromStorage: storageData 为空');
      return null;
    }

    // 如果已经是 Map，直接返回
    if (storageData instanceof Map) {
      // 验证格式
      if (storageData.has(-2) && storageData.has(-3)) {
        return storageData;
      } else {
        console.warn('CharUtils.coseKeyFromStorage: Map 格式无效，缺少 -2 或 -3 键');
        return null;
      }
    }

    // 检查是否是空对象
    if (typeof storageData === 'object' && storageData !== null) {
      const keys = Object.keys(storageData);
      if (keys.length === 0) {
        console.warn('CharUtils.coseKeyFromStorage: storageData 是空对象 {}');
        return null;
      }
    }

    // 从对象格式恢复
    let xArray, yArray;

    if (typeof storageData === 'object' && storageData !== null) {
      // 支持新格式 {_type: 'Map', x: Array, y: Array}
      if (storageData._type === 'Map') {
        if (storageData.x && storageData.y) {
          xArray = storageData.x;
          yArray = storageData.y;
          console.log('CharUtils.coseKeyFromStorage: 使用新格式 {_type: "Map", x, y}');
        } else {
          console.warn('CharUtils.coseKeyFromStorage: _type="Map" 但缺少 x 或 y', {
            hasX: !!storageData.x,
            hasY: !!storageData.y,
            xType: typeof storageData.x,
            yType: typeof storageData.y
          });
        }
      }
      // 支持旧格式 {x: Array, y: Array}（没有 _type）
      else if (storageData.x !== undefined && storageData.y !== undefined) {
        xArray = storageData.x;
        yArray = storageData.y;
        console.log('CharUtils.coseKeyFromStorage: 使用旧格式 {x, y}');
      }
      // 支持直接使用数字键的对象 {[-2]: Uint8Array, [-3]: Uint8Array}
      else if (storageData[-2] !== undefined && storageData[-3] !== undefined) {
        xArray = this.uint8ArrayToArray(storageData[-2]);
        yArray = this.uint8ArrayToArray(storageData[-3]);
        console.log('CharUtils.coseKeyFromStorage: 使用数字键格式 {-2, -3}');
      }
      // 尝试使用 get 方法（兼容某些代理对象）
      else if (typeof storageData.get === 'function') {
        const xVal = storageData.get(-2);
        const yVal = storageData.get(-3);
        if (xVal !== undefined && yVal !== undefined) {
          xArray = this.uint8ArrayToArray(xVal);
          yArray = this.uint8ArrayToArray(yVal);
          console.log('CharUtils.coseKeyFromStorage: 使用 get 方法');
        }
      }

      // 如果还没有找到，尝试检查所有可能的键
      if (!xArray || !yArray) {
        const keys = Object.keys(storageData);
        console.warn('CharUtils.coseKeyFromStorage: 尝试所有键:', keys);
        console.warn('CharUtils.coseKeyFromStorage: 存储数据详情:', {
          keys: keys,
          xExists: 'x' in storageData || -2 in storageData,
          yExists: 'y' in storageData || -3 in storageData,
          hasType: '_type' in storageData,
          type: storageData._type
        });
      }
    } else {
      console.warn('CharUtils.coseKeyFromStorage: storageData 不是对象', typeof storageData);
    }

    if (!xArray || !yArray) {
      console.warn('CharUtils.coseKeyFromStorage: 无法从存储数据中提取 x 或 y 坐标');
      console.warn('存储数据:', JSON.stringify(storageData, null, 2));
      return null;
    }

    // 确保 xArray 和 yArray 是数组格式
    if (!Array.isArray(xArray)) {
      // 尝试转换
      const converted = this.uint8ArrayToArray(xArray);
      if (converted) {
        xArray = converted;
      } else {
        console.warn('CharUtils.coseKeyFromStorage: x 不是数组且无法转换', typeof xArray, xArray);
        return null;
      }
    }

    if (!Array.isArray(yArray)) {
      // 尝试转换
      const converted = this.uint8ArrayToArray(yArray);
      if (converted) {
        yArray = converted;
      } else {
        console.warn('CharUtils.coseKeyFromStorage: y 不是数组且无法转换', typeof yArray, yArray);
        return null;
      }
    }

    // 转换为 Uint8Array
    const xBytes = this.arrayToUint8Array(xArray);
    const yBytes = this.arrayToUint8Array(yArray);

    if (!xBytes || !yBytes) {
      console.warn('CharUtils.coseKeyFromStorage: 无法将数组转换为 Uint8Array', {
        xArrayType: typeof xArray,
        xArrayIsArray: Array.isArray(xArray),
        xArrayLength: Array.isArray(xArray) ? xArray.length : 'N/A',
        yArrayType: typeof yArray,
        yArrayIsArray: Array.isArray(yArray),
        yArrayLength: Array.isArray(yArray) ? yArray.length : 'N/A'
      });
      return null;
    }

    // 验证长度（P-256 曲线的坐标应该是 32 字节）
    if (xBytes.length !== 32 || yBytes.length !== 32) {
      console.warn('CharUtils.coseKeyFromStorage: 坐标长度不正确，期望 32 字节', {
        xLength: xBytes.length,
        yLength: yBytes.length
      });
      // 不返回 null，仍然尝试创建，因为某些情况下长度可能不同
    }

    // 创建 Map
    const coseKey = new Map();
    coseKey.set(-2, xBytes);
    coseKey.set(-3, yBytes);

    console.log('CharUtils.coseKeyFromStorage: 成功恢复 COSE 密钥', {
      xLength: xBytes.length,
      yLength: yBytes.length
    });

    return coseKey;
  }

  /**
   * 验证 COSE 公钥格式是否有效
   * @param {Map|Object} coseKey - COSE 公钥
   * @returns {boolean} 是否有效
   */
  static isValidCoseKey(coseKey) {
    if (!coseKey) return false;

    let x, y;

    if (coseKey instanceof Map) {
      x = coseKey.get(-2);
      y = coseKey.get(-3);
    } else if (typeof coseKey === 'object') {
      x = coseKey[-2] || coseKey.get?.(-2);
      y = coseKey[-3] || coseKey.get?.(-3);
    } else {
      return false;
    }

    // 检查 x 和 y 是否存在且为有效的字节数组
    if (!x || !y) return false;

    const xBytes = this.arrayToUint8Array(x);
    const yBytes = this.arrayToUint8Array(y);

    // P-256 曲线的坐标应该是 32 字节
    if (!xBytes || !yBytes || xBytes.length !== 32 || yBytes.length !== 32) {
      return false;
    }

    return true;
  }

  /**
   * 从各种可能的格式中提取 COSE 公钥的 x 和 y 坐标
   * @param {Map|Object|any} coseKey - COSE 公钥（任意格式）
   * @returns {{x: Uint8Array, y: Uint8Array}|null} x 和 y 坐标
   */
  static extractCoseKeyCoordinates(coseKey) {
    if (!coseKey) return null;

    let x, y;

    // 尝试从 Map 提取
    if (coseKey instanceof Map) {
      x = coseKey.get(-2);
      y = coseKey.get(-3);
    }
    // 尝试从对象提取（数字键或字符串键）
    else if (typeof coseKey === 'object' && coseKey !== null) {
      x = coseKey[-2] !== undefined ? coseKey[-2] : (coseKey.get?.(-2));
      y = coseKey[-3] !== undefined ? coseKey[-3] : (coseKey.get?.(-3));
    }

    if (!x || !y) {
      // 如果直接提取失败，尝试从存储格式恢复
      const restored = this.coseKeyFromStorage(coseKey);
      if (restored) {
        x = restored.get(-2);
        y = restored.get(-3);
      } else {
        return null;
      }
    }

    // 转换为 Uint8Array
    const xBytes = this.arrayToUint8Array(x);
    const yBytes = this.arrayToUint8Array(y);

    if (!xBytes || !yBytes) return null;

    return { x: xBytes, y: yBytes };
  }

  /**
   * 规范化 COSE 公钥格式：将各种可能的格式统一转换为 Map 格式
   * 这个方法会尝试多种方式转换，确保兼容性
   * @param {Map|Object|any} publicKey - 任意格式的公钥
   * @returns {Map|null} 规范化的 Map 格式公钥
   */
  static normalizeCoseKey(publicKey) {
    if (!publicKey) return null;

    // 检查是否是空对象
    if (typeof publicKey === 'object' && publicKey !== null && 
        !(publicKey instanceof Map) && 
        Object.keys(publicKey).length === 0) {
      console.warn('CharUtils.normalizeCoseKey: publicKey 是空对象');
      return null;
    }

    // 如果已经是 Map 格式且有效，直接返回
    if (publicKey instanceof Map) {
      if (publicKey.has(-2) && publicKey.has(-3)) {
        return publicKey;
      }
    }

    // 尝试从存储格式恢复
    const restored = this.coseKeyFromStorage(publicKey);
    if (restored) {
      return restored;
    }

    // 尝试直接提取坐标并创建 Map
    const coords = this.extractCoseKeyCoordinates(publicKey);
    if (coords && coords.x && coords.y) {
      const map = new Map();
      map.set(-2, coords.x);
      map.set(-3, coords.y);
      return map;
    }

    console.warn('CharUtils.normalizeCoseKey: 无法规范化公钥格式', publicKey);
    return null;
  }

  /**
   * 从 localStorage 中查找 publicKey
   * 尝试多种方式匹配 credential ID
   * @param {string|Array|Uint8Array|ArrayBuffer} credentialId - Credential ID（可能是多种格式）
   * @param {string} prefix - localStorage 键前缀，默认为 'new_wallet_pk_'
   * @returns {Map|null} 恢复的 COSE 密钥 Map，如果找不到则返回 null
   */
  static findPublicKeyFromStorage(credentialId, prefix = 'new_wallet_pk_') {
    if (!credentialId) return null;

    // 尝试多种格式转换 credential ID
    const candidates = [];
    
    if (typeof credentialId === 'string') {
      // 字符串格式：可能是 base64url，转换为 base64
      candidates.push(credentialId.replace(/-/g, '+').replace(/_/g, '/'));
    } else {
      // 数组或 Uint8Array 格式：转换为 base64
      const base64 = this.uint8ArrayToBase64(credentialId);
      if (base64) {
        candidates.push(base64);
      }
    }

    // 尝试每个候选值
    for (const candidate of candidates) {
      const key = `${prefix}${candidate}`;
      const stored = localStorage.getItem(key);
      if (stored) {
        try {
          const keyData = JSON.parse(stored);
          const restored = this.coseKeyFromStorage(keyData);
          if (restored) {
            console.log(`✅ 从 localStorage 找到 Public Key (key: ${key.substring(0, 20)}...)`);
            return restored;
          }
        } catch (e) {
          console.warn(`解析 localStorage 数据失败 (key: ${key}):`, e);
        }
      }
    }

    // 如果精确匹配失败，尝试查找所有相关的键
    const allKeys = Object.keys(localStorage);
    const relatedKeys = allKeys.filter(key => key.startsWith(prefix));
    
    if (relatedKeys.length > 0) {
      console.log(`📋 找到 ${relatedKeys.length} 个相关的 localStorage 键，尝试第一个`);
      const firstKey = relatedKeys[0];
      const stored = localStorage.getItem(firstKey);
      if (stored) {
        try {
          const keyData = JSON.parse(stored);
          const restored = this.coseKeyFromStorage(keyData);
          if (restored) {
            console.log(`✅ 从 localStorage 找到 Public Key (使用第一个相关键: ${firstKey.substring(0, 20)}...)`);
            return restored;
          }
        } catch (e) {
          console.warn(`解析 localStorage 数据失败 (key: ${firstKey}):`, e);
        }
      }
    }

    return null;
  }

  /**
   * 将 ArrayBuffer 转换为 Uint8Array
   * @param {ArrayBuffer} buffer - ArrayBuffer
   * @returns {Uint8Array} Uint8Array
   */
  static arrayBufferToUint8Array(buffer) {
    if (!buffer || !(buffer instanceof ArrayBuffer)) return null;
    return new Uint8Array(buffer);
  }

  /**
   * 将 Uint8Array 转换为 ArrayBuffer
   * @param {Uint8Array|Array<number>} data - 输入数据
   * @returns {ArrayBuffer} ArrayBuffer
   */
  static uint8ArrayToArrayBuffer(data) {
    const arr = this.arrayToUint8Array(data);
    if (!arr) return null;
    return arr.buffer.slice(arr.byteOffset, arr.byteOffset + arr.byteLength);
  }
}

export default CharUtils;

