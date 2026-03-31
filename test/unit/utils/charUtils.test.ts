import { describe, it, expect, vi } from 'vitest'
import CharUtils from '@/utils/CharUtils'

vi.mock('@/utils/DbgLog', () => ({
  log: vi.fn(),
}))

vi.mock('@/utils/safeStorage', () => ({
  safeGetItem: vi.fn(() => null),
  safeKeys: vi.fn(() => []),
}))

// ─── uint8ArrayToArray ──────────────────────────────────────────────────

describe('CharUtils.uint8ArrayToArray', () => {
  it('converts Uint8Array to number[]', () => {
    const arr = CharUtils.uint8ArrayToArray(new Uint8Array([1, 2, 3]))
    expect(arr).toEqual([1, 2, 3])
  })

  it('passes through a plain number[]', () => {
    expect(CharUtils.uint8ArrayToArray([10, 20])).toEqual([10, 20])
  })

  it('converts ArrayBuffer', () => {
    const buf = new Uint8Array([4, 5, 6]).buffer
    expect(CharUtils.uint8ArrayToArray(buf)).toEqual([4, 5, 6])
  })

  it('returns null for null/undefined', () => {
    expect(CharUtils.uint8ArrayToArray(null)).toBeNull()
    expect(CharUtils.uint8ArrayToArray(undefined)).toBeNull()
  })
})

// ─── arrayToUint8Array ──────────────────────────────────────────────────

describe('CharUtils.arrayToUint8Array', () => {
  it('converts number[] to Uint8Array', () => {
    const result = CharUtils.arrayToUint8Array([1, 2, 3])
    expect(result).toBeInstanceOf(Uint8Array)
    expect(Array.from(result!)).toEqual([1, 2, 3])
  })

  it('passes through Uint8Array', () => {
    const input = new Uint8Array([7, 8])
    expect(CharUtils.arrayToUint8Array(input)).toBe(input)
  })

  it('converts index-keyed object like {0: 1, 1: 2}', () => {
    const result = CharUtils.arrayToUint8Array({ '0': 1, '1': 2 })
    expect(result).toBeInstanceOf(Uint8Array)
    expect(Array.from(result!)).toEqual([1, 2])
  })

  it('returns null for null/undefined', () => {
    expect(CharUtils.arrayToUint8Array(null)).toBeNull()
    expect(CharUtils.arrayToUint8Array(undefined)).toBeNull()
  })
})

// ─── Hex conversion ─────────────────────────────────────────────────────

describe('CharUtils hex conversion', () => {
  const sample = new Uint8Array([0xab, 0xcd, 0xef])

  it('uint8ArrayToHex produces 0x-prefixed hex', () => {
    expect(CharUtils.uint8ArrayToHex(sample)).toBe('0xabcdef')
  })

  it('uint8ArrayToHex without prefix', () => {
    expect(CharUtils.uint8ArrayToHex(sample, false)).toBe('abcdef')
  })

  it('hexToUint8Array parses 0x-prefixed hex', () => {
    const result = CharUtils.hexToUint8Array('0xabcdef')
    expect(result).toBeInstanceOf(Uint8Array)
    expect(Array.from(result!)).toEqual([0xab, 0xcd, 0xef])
  })

  it('hexToUint8Array parses non-prefixed hex', () => {
    const result = CharUtils.hexToUint8Array('abcdef')
    expect(Array.from(result!)).toEqual([0xab, 0xcd, 0xef])
  })

  it('hexToUint8Array returns null for odd-length hex', () => {
    expect(CharUtils.hexToUint8Array('abc')).toBeNull()
  })

  it('hexToUint8Array returns null for null/undefined', () => {
    expect(CharUtils.hexToUint8Array(null)).toBeNull()
    expect(CharUtils.hexToUint8Array(undefined)).toBeNull()
  })

  it('round-trip: hex → Uint8Array → hex', () => {
    const hex = '0xdeadbeef'
    const bytes = CharUtils.hexToUint8Array(hex)
    const back = CharUtils.uint8ArrayToHex(bytes!)
    expect(back).toBe(hex)
  })
})

// ─── Base64 conversion ──────────────────────────────────────────────────

describe('CharUtils base64 conversion', () => {
  it('uint8ArrayToBase64 and base64ToUint8Array round-trip', () => {
    const original = new Uint8Array([72, 101, 108, 108, 111]) // "Hello"
    const b64 = CharUtils.uint8ArrayToBase64(original)
    expect(typeof b64).toBe('string')
    const back = CharUtils.base64ToUint8Array(b64!)
    expect(Array.from(back!)).toEqual(Array.from(original))
  })

  it('base64ToUint8Array returns null for null/undefined', () => {
    expect(CharUtils.base64ToUint8Array(null)).toBeNull()
    expect(CharUtils.base64ToUint8Array(undefined)).toBeNull()
  })
})

// ─── Base64URL conversion ───────────────────────────────────────────────

describe('CharUtils base64URL conversion', () => {
  it('uint8ArrayToBase64URL strips padding and uses URL-safe chars', () => {
    const data = new Uint8Array([255, 254, 253])
    const b64url = CharUtils.uint8ArrayToBase64URL(data)
    expect(b64url).not.toContain('+')
    expect(b64url).not.toContain('/')
    expect(b64url).not.toContain('=')
  })

  it('base64URLToUint8Array round-trip', () => {
    const original = new Uint8Array([0, 128, 255])
    const b64url = CharUtils.uint8ArrayToBase64URL(original)
    const back = CharUtils.base64URLToUint8Array(b64url!)
    expect(Array.from(back!)).toEqual(Array.from(original))
  })

  it('base64URLToUint8Array returns null for null/undefined', () => {
    expect(CharUtils.base64URLToUint8Array(null)).toBeNull()
    expect(CharUtils.base64URLToUint8Array(undefined)).toBeNull()
  })
})

// ─── String conversion ──────────────────────────────────────────────────

describe('CharUtils string conversion', () => {
  it('stringToUint8Array encodes UTF-8', () => {
    const result = CharUtils.stringToUint8Array('AB')
    expect(Array.from(result!)).toEqual([65, 66])
  })

  it('uint8ArrayToString decodes UTF-8', () => {
    const result = CharUtils.uint8ArrayToString(new Uint8Array([65, 66]))
    expect(result).toBe('AB')
  })

  it('round-trip: string → Uint8Array → string', () => {
    const str = 'Hello 世界'
    const bytes = CharUtils.stringToUint8Array(str)
    const back = CharUtils.uint8ArrayToString(bytes!)
    expect(back).toBe(str)
  })

  it('stringToUint8Array returns null for null', () => {
    expect(CharUtils.stringToUint8Array(null)).toBeNull()
  })
})

// ─── COSE key operations ────────────────────────────────────────────────

describe('CharUtils COSE key operations', () => {
  const x = new Uint8Array(32).fill(0xaa)
  const y = new Uint8Array(32).fill(0xbb)

  function makeMapKey(): Map<number, Uint8Array> {
    const m = new Map<number, Uint8Array>()
    m.set(-2, x)
    m.set(-3, y)
    return m
  }

  describe('isValidCoseKey', () => {
    it('returns true for valid Map COSE key', () => {
      expect(CharUtils.isValidCoseKey(makeMapKey())).toBe(true)
    })

    it('returns false for null', () => {
      expect(CharUtils.isValidCoseKey(null)).toBe(false)
    })

    it('returns false for empty Map', () => {
      expect(CharUtils.isValidCoseKey(new Map())).toBe(false)
    })

    it('returns false for key with wrong coordinate length', () => {
      const m = new Map<number, Uint8Array>()
      m.set(-2, new Uint8Array(16))
      m.set(-3, new Uint8Array(16))
      expect(CharUtils.isValidCoseKey(m)).toBe(false)
    })
  })

  describe('extractCoseKeyCoordinates', () => {
    it('extracts x and y from Map key', () => {
      const coords = CharUtils.extractCoseKeyCoordinates(makeMapKey())
      expect(coords).not.toBeNull()
      expect(Array.from(coords!.x)).toEqual(Array.from(x))
      expect(Array.from(coords!.y)).toEqual(Array.from(y))
    })

    it('returns null for null', () => {
      expect(CharUtils.extractCoseKeyCoordinates(null)).toBeNull()
    })
  })

  describe('coseKeyToStorage / coseKeyFromStorage round-trip', () => {
    it('serializes and restores a Map COSE key', () => {
      const storage = CharUtils.coseKeyToStorage(makeMapKey())
      expect(storage).not.toBeNull()
      expect(storage!._type).toBe('Map')
      expect(storage!.x.length).toBe(32)
      expect(storage!.y.length).toBe(32)

      const restored = CharUtils.coseKeyFromStorage(storage!)
      expect(restored).not.toBeNull()
      expect(Array.from(restored!.get(-2)!)).toEqual(Array.from(x))
      expect(Array.from(restored!.get(-3)!)).toEqual(Array.from(y))
    })

    it('coseKeyToStorage returns null for null', () => {
      expect(CharUtils.coseKeyToStorage(null)).toBeNull()
    })

    it('coseKeyFromStorage returns null for null', () => {
      expect(CharUtils.coseKeyFromStorage(null)).toBeNull()
    })

    it('coseKeyFromStorage returns null for empty object', () => {
      expect(CharUtils.coseKeyFromStorage({} as never)).toBeNull()
    })
  })

  describe('normalizeCoseKey', () => {
    it('passes through a valid Map key', () => {
      const key = makeMapKey()
      const norm = CharUtils.normalizeCoseKey(key)
      expect(norm).toBe(key)
    })

    it('restores from storage format', () => {
      const storage = CharUtils.coseKeyToStorage(makeMapKey())
      const norm = CharUtils.normalizeCoseKey(storage!)
      expect(norm).not.toBeNull()
      expect(norm).toBeInstanceOf(Map)
      expect(norm!.has(-2)).toBe(true)
      expect(norm!.has(-3)).toBe(true)
    })

    it('returns null for null', () => {
      expect(CharUtils.normalizeCoseKey(null)).toBeNull()
    })

    it('returns null for empty object', () => {
      expect(CharUtils.normalizeCoseKey({})).toBeNull()
    })
  })
})

// ─── ArrayBuffer conversion ─────────────────────────────────────────────

describe('CharUtils ArrayBuffer conversion', () => {
  it('arrayBufferToUint8Array converts an ArrayBuffer', () => {
    const ab = new Uint8Array([1, 2, 3]).buffer
    const result = CharUtils.arrayBufferToUint8Array(ab as ArrayBuffer)
    expect(result).toBeInstanceOf(Uint8Array)
    expect(Array.from(result!)).toEqual([1, 2, 3])
  })

  it('arrayBufferToUint8Array returns null for null', () => {
    expect(CharUtils.arrayBufferToUint8Array(null)).toBeNull()
  })

  it('uint8ArrayToArrayBuffer round-trips', () => {
    const original = new Uint8Array([10, 20, 30])
    const ab = CharUtils.uint8ArrayToArrayBuffer(original)
    expect(ab).toBeInstanceOf(ArrayBuffer)
    const back = new Uint8Array(ab!)
    expect(Array.from(back)).toEqual([10, 20, 30])
  })
})
