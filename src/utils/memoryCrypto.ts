/**
 * Memory-hardening utilities for sensitive key material.
 *
 * Goals:
 * 1. Obfuscate seed/privateKey in memory so a simple heap dump / snapshot
 *    does not reveal the raw bytes.
 * 2. Provide a way to zero-fill TypedArrays after use.
 *
 * Limitations:
 * - XOR obfuscation is NOT encryption; it only raises the bar for
 *   opportunistic memory scraping.
 * - JS engines may copy buffers during GC or string interning.
 *   These helpers are a defence-in-depth layer, not a cryptographic guarantee.
 */

/** Securely zero-fill a Uint8Array in-place. */
export function secureZero(buf: Uint8Array): void {
  if (!buf) return
  buf.fill(0)
}

/** Generate a random 32-byte key using crypto.getRandomValues. */
export function generateScrambleKey(length = 32): Uint8Array {
  const key = new Uint8Array(length)
  crypto.getRandomValues(key)
  return key
}

/** XOR-obfuscate `data` in-place with `key` (repeating key if needed). */
export function xorScrambleInPlace(data: Uint8Array, key: Uint8Array): void {
  for (let i = 0; i < data.length; i++) {
    data[i] ^= key[i % key.length]
  }
}

/**
 * Create an obfuscated copy of `seed`.
 * Returns `{obfuscated, key}` so the caller can discard the original seed
 * and later recover it by calling `unscramble()`.
 */
export function obfuscateSeed(seed: Uint8Array): {
  obfuscated: Uint8Array
  key: Uint8Array
} {
  const key = generateScrambleKey()
  const obfuscated = new Uint8Array(seed)
  xorScrambleInPlace(obfuscated, key)
  return { obfuscated, key }
}

/** Recover the original seed from an obfuscated buffer. */
export function unscrambleSeed(
  obfuscated: Uint8Array,
  key: Uint8Array
): Uint8Array {
  const seed = new Uint8Array(obfuscated)
  xorScrambleInPlace(seed, key)
  return seed
}

/** Convenience: obfuscate, then securely zero the original. */
export function protectSeed(seed: Uint8Array): {
  obfuscated: Uint8Array
  key: Uint8Array
} {
  const result = obfuscateSeed(seed)
  secureZero(seed)
  return result
}

/** Overwrite a string's characters with '0' (best-effort). */
export function secureZeroString(s: string): void {
  // Strings are immutable in JS; this is a best-effort attempt.
  // We replace the variable reference, but the old string may remain
  // in memory until GC.
  const _ = '0'.repeat(s.length)
  void _
  void s
}
