import * as DbgLog from './DbgLog';
import { safeGetItem, safeKeys } from './safeStorage';

type ByteLike = Uint8Array | ArrayBuffer | DataView | Array<number>;
type CoseKey = Map<number, Uint8Array> | Record<string | number, unknown>;

interface CoseStorageFormat {
  _type: 'Map';
  x: number[];
  y: number[];
}

interface CoseCoordinates {
  x: Uint8Array;
  y: Uint8Array;
}

class CharUtils {
  static uint8ArrayToArray(data: ByteLike | null | undefined): number[] | null {
    if (!data) return null;
    if (Array.isArray(data)) return data;
    if (data instanceof Uint8Array) return Array.from(data);
    if (data instanceof ArrayBuffer) return Array.from(new Uint8Array(data));
    if (data instanceof DataView) {
      const arr = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
      return Array.from(arr);
    }
    try {
      return Array.from(new Uint8Array(data as ArrayBuffer));
    } catch (e) {
      console.warn('CharUtils.uint8ArrayToArray: 无法转换数据', e);
      return null;
    }
  }

  static arrayToUint8Array(data: ByteLike | Record<string, unknown> | null | undefined): Uint8Array | null {
    if (!data) return null;
    if (data instanceof Uint8Array) return data;
    if (data instanceof ArrayBuffer) return new Uint8Array(data);
    if (Array.isArray(data)) {
      const numbers = data.map(v => typeof v === 'number' ? v : Number(v));
      return new Uint8Array(numbers);
    }
    if (typeof data === 'object' && (data as object).constructor === Object) {
      try {
        const obj = data as Record<string, unknown>;
        const keys = Object.keys(obj).map(k => parseInt(k, 10)).filter(k => !isNaN(k));
        if (keys.length > 0) {
          const maxKey = Math.max(...keys);
          const arr = new Array(maxKey + 1);
          for (const key of keys) {
            arr[key] = typeof obj[key] === 'number' ? obj[key] : Number(obj[key]);
          }
          return new Uint8Array(arr);
        }
        return new Uint8Array(Object.values(obj).map(v => typeof v === 'number' ? v : Number(v)));
      } catch (e) {
        console.warn('CharUtils.arrayToUint8Array: 无法从对象创建', e, data);
        return null;
      }
    }
    return null;
  }

  static uint8ArrayToBase64(data: ByteLike | null | undefined): string | null {
    if (!data) return null;
    const arr = this.arrayToUint8Array(data);
    if (!arr) return null;
    const binary = String.fromCharCode(...arr);
    return btoa(binary);
  }

  static base64ToUint8Array(base64: string | null | undefined): Uint8Array | null {
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

  static uint8ArrayToBase64URL(data: ByteLike | null | undefined): string | null {
    const base64 = this.uint8ArrayToBase64(data);
    if (!base64) return null;
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }

  static base64URLToUint8Array(base64url: string | null | undefined): Uint8Array | null {
    if (!base64url || typeof base64url !== 'string') return null;
    try {
      let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
      while (base64.length % 4) {
        base64 += '=';
      }
      return this.base64ToUint8Array(base64);
    } catch (e) {
      console.warn('CharUtils.base64URLToUint8Array: Base64URL 解码失败', e);
      return null;
    }
  }

  static uint8ArrayToHex(data: ByteLike | null | undefined, prefix = true): string | null {
    const arr = this.arrayToUint8Array(data);
    if (!arr) return null;
    const hex = Array.from(arr)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    return prefix ? '0x' + hex : hex;
  }

  static hexToUint8Array(hex: string | null | undefined): Uint8Array | null {
    if (!hex || typeof hex !== 'string') return null;
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

  static stringToUint8Array(str: string | null | undefined): Uint8Array | null {
    if (!str || typeof str !== 'string') return null;
    const encoder = new TextEncoder();
    return encoder.encode(str);
  }

  static uint8ArrayToString(data: ByteLike | null | undefined): string | null {
    const arr = this.arrayToUint8Array(data);
    if (!arr) return null;
    const decoder = new TextDecoder('utf-8');
    return decoder.decode(arr);
  }

  static coseKeyToStorage(coseKey: CoseKey | null | undefined): CoseStorageFormat | null {
    if (!coseKey) {
      console.warn('CharUtils.coseKeyToStorage: coseKey 为空');
      return null;
    }

    let x: unknown, y: unknown;

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
      const obj = coseKey as Record<string | number, unknown>;
      x = obj[-2] !== undefined ? obj[-2] : ((obj as { get?: (k: number) => unknown }).get?.(-2));
      y = obj[-3] !== undefined ? obj[-3] : ((obj as { get?: (k: number) => unknown }).get?.(-3));

      if (!x || !y) {
        console.warn('CharUtils.coseKeyToStorage: 对象中缺少 -2 或 -3 键', {
          hasMinus2: -2 in obj,
          hasMinus3: -3 in obj,
          hasGet: typeof (obj as { get?: unknown }).get === 'function',
          keys: Object.keys(obj)
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

    const xArray = this.uint8ArrayToArray(x as ByteLike);
    const yArray = this.uint8ArrayToArray(y as ByteLike);

    if (!xArray || !yArray) {
      console.warn('CharUtils.coseKeyToStorage: 无法转换 x 或 y 坐标为数组', {
        xType: typeof x,
        xIsUint8Array: x instanceof Uint8Array,
        yType: typeof y,
        yIsUint8Array: y instanceof Uint8Array
      });
      return null;
    }

    const result: CoseStorageFormat = {
      _type: 'Map',
      x: Array.isArray(xArray) ? xArray : Array.from(xArray),
      y: Array.isArray(yArray) ? yArray : Array.from(yArray)
    };

    DbgLog.log('CharUtils.coseKeyToStorage: 成功转换 COSE 密钥', {
      xLength: result.x.length,
      yLength: result.y.length
    });

    return result;
  }

  static coseKeyFromStorage(storageData: CoseStorageFormat | CoseKey | null | undefined): Map<number, Uint8Array> | null {
    if (!storageData) {
      console.warn('CharUtils.coseKeyFromStorage: storageData 为空');
      return null;
    }

    if (storageData instanceof Map) {
      if (storageData.has(-2) && storageData.has(-3)) {
        return storageData as Map<number, Uint8Array>;
      } else {
        console.warn('CharUtils.coseKeyFromStorage: Map 格式无效，缺少 -2 或 -3 键');
        return null;
      }
    }

    if (typeof storageData === 'object' && storageData !== null) {
      const keys = Object.keys(storageData);
      if (keys.length === 0) {
        console.warn('CharUtils.coseKeyFromStorage: storageData 是空对象 {}');
        return null;
      }
    }

    let xArray: unknown, yArray: unknown;
    const obj = storageData as Record<string | number, unknown>;

    if (typeof storageData === 'object' && storageData !== null) {
      if ((obj as unknown as CoseStorageFormat)._type === 'Map') {
        const typed = obj as unknown as CoseStorageFormat;
        if (typed.x && typed.y) {
          xArray = typed.x;
          yArray = typed.y;
          DbgLog.log('CharUtils.coseKeyFromStorage: 使用新格式 {_type: "Map", x, y}');
        } else {
          console.warn('CharUtils.coseKeyFromStorage: _type="Map" 但缺少 x 或 y', {
            hasX: !!typed.x,
            hasY: !!typed.y,
            xType: typeof typed.x,
            yType: typeof typed.y
          });
        }
      } else if ((obj as { x?: unknown; y?: unknown }).x !== undefined && (obj as { x?: unknown; y?: unknown }).y !== undefined) {
        xArray = (obj as { x: unknown }).x;
        yArray = (obj as { y: unknown }).y;
        DbgLog.log('CharUtils.coseKeyFromStorage: 使用旧格式 {x, y}');
      } else if (obj[-2] !== undefined && obj[-3] !== undefined) {
        xArray = this.uint8ArrayToArray(obj[-2] as ByteLike);
        yArray = this.uint8ArrayToArray(obj[-3] as ByteLike);
        DbgLog.log('CharUtils.coseKeyFromStorage: 使用数字键格式 {-2, -3}');
      } else if (typeof (obj as { get?: unknown }).get === 'function') {
        const getter = obj as { get: (k: number) => unknown };
        const xVal = getter.get(-2);
        const yVal = getter.get(-3);
        if (xVal !== undefined && yVal !== undefined) {
          xArray = this.uint8ArrayToArray(xVal as ByteLike);
          yArray = this.uint8ArrayToArray(yVal as ByteLike);
          DbgLog.log('CharUtils.coseKeyFromStorage: 使用 get 方法');
        }
      }

      if (!xArray || !yArray) {
        const keys = Object.keys(storageData);
        console.warn('CharUtils.coseKeyFromStorage: 尝试所有键:', keys);
        console.warn('CharUtils.coseKeyFromStorage: 存储数据详情:', {
          keys,
          xExists: 'x' in obj || -2 in obj,
          yExists: 'y' in obj || -3 in obj,
          hasType: '_type' in obj,
          type: (obj as { _type?: string })._type
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

    if (!Array.isArray(xArray)) {
      const converted = this.uint8ArrayToArray(xArray as ByteLike);
      if (converted) {
        xArray = converted;
      } else {
        console.warn('CharUtils.coseKeyFromStorage: x 不是数组且无法转换', typeof xArray, xArray);
        return null;
      }
    }

    if (!Array.isArray(yArray)) {
      const converted = this.uint8ArrayToArray(yArray as ByteLike);
      if (converted) {
        yArray = converted;
      } else {
        console.warn('CharUtils.coseKeyFromStorage: y 不是数组且无法转换', typeof yArray, yArray);
        return null;
      }
    }

    const xBytes = this.arrayToUint8Array(xArray as number[]);
    const yBytes = this.arrayToUint8Array(yArray as number[]);

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

    if (xBytes.length !== 32 || yBytes.length !== 32) {
      console.warn('CharUtils.coseKeyFromStorage: 坐标长度不正确，期望 32 字节', {
        xLength: xBytes.length,
        yLength: yBytes.length
      });
    }

    const coseKey = new Map<number, Uint8Array>();
    coseKey.set(-2, xBytes);
    coseKey.set(-3, yBytes);

    DbgLog.log('CharUtils.coseKeyFromStorage: 成功恢复 COSE 密钥', {
      xLength: xBytes.length,
      yLength: yBytes.length
    });

    return coseKey;
  }

  static isValidCoseKey(coseKey: CoseKey | null | undefined): boolean {
    if (!coseKey) return false;

    let x: unknown, y: unknown;

    if (coseKey instanceof Map) {
      x = coseKey.get(-2);
      y = coseKey.get(-3);
    } else if (typeof coseKey === 'object') {
      const obj = coseKey as Record<string | number, unknown>;
      x = obj[-2] || (obj as { get?: (k: number) => unknown }).get?.(-2);
      y = obj[-3] || (obj as { get?: (k: number) => unknown }).get?.(-3);
    } else {
      return false;
    }

    if (!x || !y) return false;

    const xBytes = this.arrayToUint8Array(x as ByteLike);
    const yBytes = this.arrayToUint8Array(y as ByteLike);

    if (!xBytes || !yBytes || xBytes.length !== 32 || yBytes.length !== 32) {
      return false;
    }

    return true;
  }

  static extractCoseKeyCoordinates(coseKey: CoseKey | null | undefined): CoseCoordinates | null {
    if (!coseKey) return null;

    let x: unknown, y: unknown;

    if (coseKey instanceof Map) {
      x = coseKey.get(-2);
      y = coseKey.get(-3);
    } else if (typeof coseKey === 'object' && coseKey !== null) {
      const obj = coseKey as Record<string | number, unknown>;
      x = obj[-2] !== undefined ? obj[-2] : (obj as { get?: (k: number) => unknown }).get?.(-2);
      y = obj[-3] !== undefined ? obj[-3] : (obj as { get?: (k: number) => unknown }).get?.(-3);
    }

    if (!x || !y) {
      const restored = this.coseKeyFromStorage(coseKey);
      if (restored) {
        x = restored.get(-2);
        y = restored.get(-3);
      } else {
        return null;
      }
    }

    const xBytes = this.arrayToUint8Array(x as ByteLike);
    const yBytes = this.arrayToUint8Array(y as ByteLike);

    if (!xBytes || !yBytes) return null;

    return { x: xBytes, y: yBytes };
  }

  static normalizeCoseKey(publicKey: CoseKey | null | undefined): Map<number, Uint8Array> | null {
    if (!publicKey) return null;

    if (typeof publicKey === 'object' && publicKey !== null &&
        !(publicKey instanceof Map) &&
        Object.keys(publicKey).length === 0) {
      console.warn('CharUtils.normalizeCoseKey: publicKey 是空对象');
      return null;
    }

    if (publicKey instanceof Map) {
      if (publicKey.has(-2) && publicKey.has(-3)) {
        return publicKey as Map<number, Uint8Array>;
      }
    }

    const restored = this.coseKeyFromStorage(publicKey);
    if (restored) {
      return restored;
    }

    const coords = this.extractCoseKeyCoordinates(publicKey);
    if (coords && coords.x && coords.y) {
      const map = new Map<number, Uint8Array>();
      map.set(-2, coords.x);
      map.set(-3, coords.y);
      return map;
    }

    console.warn('CharUtils.normalizeCoseKey: 无法规范化公钥格式', publicKey);
    return null;
  }

  static findPublicKeyFromStorage(credentialId: string | ByteLike | null | undefined, prefix = 'new_wallet_pk_'): Map<number, Uint8Array> | null {
    if (!credentialId) return null;

    const candidates: string[] = [];

    if (typeof credentialId === 'string') {
      candidates.push(credentialId.replace(/-/g, '+').replace(/_/g, '/'));
    } else {
      const base64 = this.uint8ArrayToBase64(credentialId);
      if (base64) {
        candidates.push(base64);
      }
    }

    for (const candidate of candidates) {
      const key = `${prefix}${candidate}`;
      const stored = safeGetItem(key);
      if (stored) {
        try {
          const keyData = JSON.parse(stored);
          const restored = this.coseKeyFromStorage(keyData);
          if (restored) {
            DbgLog.log(`✅ Found Public Key (key: ${key.substring(0, 20)}...)`);
            return restored;
          }
        } catch (e) {
          console.warn(`Failed to parse stored key (key: ${key}):`, e);
        }
      }
    }

    const allKeys = safeKeys();
    const relatedKeys = allKeys.filter(key => key.startsWith(prefix));

    if (relatedKeys.length > 0) {
      const firstKey = relatedKeys[0];
      const stored = safeGetItem(firstKey);
      if (stored) {
        try {
          const keyData = JSON.parse(stored);
          const restored = this.coseKeyFromStorage(keyData);
          if (restored) {
            DbgLog.log(`✅ Found Public Key (fallback key: ${firstKey.substring(0, 20)}...)`);
            return restored;
          }
        } catch (e) {
          console.warn(`Failed to parse stored key (key: ${firstKey}):`, e);
        }
      }
    }

    return null;
  }

  static arrayBufferToUint8Array(buffer: ArrayBuffer | null | undefined): Uint8Array | null {
    if (!buffer || !(buffer instanceof ArrayBuffer)) return null;
    return new Uint8Array(buffer);
  }

  static uint8ArrayToArrayBuffer(data: ByteLike | null | undefined): ArrayBuffer | null {
    const arr = this.arrayToUint8Array(data);
    if (!arr) return null;
    return (arr.buffer as ArrayBuffer).slice(arr.byteOffset, arr.byteOffset + arr.byteLength);
  }
}

export default CharUtils;
