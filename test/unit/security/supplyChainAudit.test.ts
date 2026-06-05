/**
 * Supply-Chain Security Audit — Static Analysis of Third-Party Dependencies
 *
 * This test scans all production dependencies (node_modules) for suspicious
 * code patterns that could be used to intercept sensitive wallet data:
 *
 * 1. Hooking navigator.credentials (WebAuthn interception)
 * 2. Hooking Worker.prototype.postMessage (seed transport interception)
 * 3. Accessing sensitive variable names (ringsecurity_masterSeed, ringsecurity_scrambleKey, privateKey, mnemonic)
 * 4. Overriding crypto.subtle (key material theft)
 * 5. Dynamic code execution (eval, Function constructor)
 * 6. Suspicious network exfiltration patterns
 * 7. Prototype pollution attacks on sensitive APIs
 *
 * NOTE: This is a heuristic scan. False positives are expected and should be
 * added to the allowlist after manual review. The goal is to detect NEW
 * suspicious patterns introduced by dependency updates.
 */

import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

const WORKSPACE_ROOT = path.resolve(__dirname, '../../..')
const NODE_MODULES = path.join(WORKSPACE_ROOT, 'node_modules')
const PACKAGE_JSON_PATH = path.join(WORKSPACE_ROOT, 'package.json')

// ─── Production dependencies (audited checklist) ─────────────────────────────
// Every production dependency MUST be listed here after security review.
// If this test fails because a new dep is missing, you MUST:
//   1. Review the new package for supply-chain threats
//   2. Add it to AUDITED_DEPS below
//   3. Add allowlist entries if needed (see ALLOWLIST section)

const AUDITED_DEPS = [
  '@lifi/sdk',
  '@morpho-org/morpho-ts',
  '@neondatabase/serverless',
  '@radix-ui/react-alert-dialog',
  '@radix-ui/react-dropdown-menu',
  '@ring-protocol/ring-swap-sdk',
  '@ring-protocol/ringearnsdk',
  '@solana/spl-token',
  '@solana/web3.js',
  '@tanstack/react-query',
  '@vercel/analytics',
  'bech32',
  'bip32',
  'bitcoinjs-lib',
  'cbor-x',
  'class-variance-authority',
  'clsx',
  'ed25519-hd-key',
  'ethers',
  'lucide-react',
  'next',
  'node-html-parser',
  'qrcode',
  'radix-ui',
  'react',
  'react-dom',
  'serve',
  'shadcn',
  'tailwind-merge',
  'tiny-secp256k1',
  'tw-animate-css',
  'undici',
  'vaul',
  'viem',
  'wagmi',
]

// ─── Dynamically read actual deps from package.json ──────────────────────────

const pkgJson = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, 'utf-8'))
const ACTUAL_PRODUCTION_DEPS: string[] = Object.keys(pkgJson.dependencies || {})

// ─── Suspicious patterns to scan for ────────────────────────────────────────

interface ScanPattern {
  /** Human-readable description of what this pattern detects */
  description: string
  /** Regex to match against file content */
  regex: RegExp
  /** Severity: 'critical' = likely malicious, 'warning' = needs review */
  severity: 'critical' | 'warning'
}

const SCAN_PATTERNS: ScanPattern[] = [
  // ── Category 1: WebAuthn / Credential interception ──
  {
    description: 'Override navigator.credentials.get',
    regex:
      /navigator\s*\.\s*credentials\s*\.\s*get\s*=|Object\.defineProperty\s*\(\s*navigator\s*(?:\.credentials)?\s*,\s*['"](?:credentials|get)['"]/,
    severity: 'critical',
  },
  {
    description: 'Override navigator.credentials.create',
    regex:
      /navigator\s*\.\s*credentials\s*\.\s*create\s*=|Object\.defineProperty\s*\(\s*navigator\s*(?:\.credentials)?\s*,\s*['"](?:credentials|create)['"]/,
    severity: 'critical',
  },
  {
    description: 'Proxy on navigator.credentials',
    regex: /new\s+Proxy\s*\(\s*navigator\s*\.\s*credentials/,
    severity: 'critical',
  },

  // ── Category 2: Worker.postMessage interception ──
  {
    description: 'Override Worker.prototype.postMessage',
    regex: /Worker\s*\.\s*prototype\s*\.\s*postMessage\s*=/,
    severity: 'critical',
  },
  {
    description: 'Override MessagePort.prototype.postMessage',
    regex: /MessagePort\s*\.\s*prototype\s*\.\s*postMessage\s*=/,
    severity: 'critical',
  },
  {
    description: 'Monkey-patch postMessage on any prototype',
    regex:
      /prototype\s*\.\s*postMessage\s*=\s*function|prototype\.postMessage\s*=\s*\(/,
    severity: 'critical',
  },

  // ── Category 3: Sensitive variable/field access patterns ──
  {
    description: 'Access to ringsecurity_ prefixed variable (seed material)',
    regex: /\bringsecurity_[a-zA-Z_]+/,
    severity: 'critical',
  },
  {
    description: 'Regex matching ringsecurity_masterSeed variable',
    regex:
      /['"]ringsecurity_masterSeed['"]\s*\]|\.ringsecurity_masterSeed\b(?!\s*[=:]\s*(?:undefined|null|void|false))/,
    severity: 'critical',
  },
  {
    description: 'Regex matching masterSeed variable',
    regex:
      /['"]masterSeed['"]\s*\]|\.masterSeed\b(?!\s*[=:]\s*(?:undefined|null|void|false))/,
    severity: 'warning',
  },
  {
    description: 'Access to userHandle with slice(0,32) pattern',
    regex: /userHandle[\s\S]{0,50}slice\s*\(\s*0\s*,\s*32\s*\)/,
    severity: 'critical',
  },
  {
    description: 'Access to privateKey field in suspicious context',
    regex:
      /\.\s*privateKey\s*[^=!<>].*(?:fetch|XMLHttpRequest|sendBeacon|WebSocket|navigator\.sendBeacon)/,
    severity: 'critical',
  },

  // ── Category 4: Crypto API override ──
  // Note: pattern must NOT match feature-detection like `crypto.subtle === void 0`
  {
    description: 'Override crypto.subtle',
    regex:
      /crypto\s*\.\s*subtle\s*=\s*[^=]|Object\.defineProperty\s*\(\s*crypto\s*,\s*['"]subtle['"]/,
    severity: 'critical',
  },
  {
    description: 'Override crypto.getRandomValues',
    regex:
      /crypto\s*\.\s*getRandomValues\s*=\s*[^=]|Object\.defineProperty\s*\(\s*crypto\s*,\s*['"]getRandomValues['"]/,
    severity: 'critical',
  },

  // ── Category 5: Dynamic code execution (often used to hide payloads) ──
  {
    description: 'eval() with variable argument (not string literal)',
    regex: /\beval\s*\(\s*[a-zA-Z_$][a-zA-Z0-9_$]*\s*\)/,
    severity: 'warning',
  },
  {
    description: 'new Function() constructor with variable',
    regex: /new\s+Function\s*\(\s*[a-zA-Z_$][a-zA-Z0-9_$]*\s*\)/,
    severity: 'warning',
  },

  // ── Category 6: Data exfiltration patterns ──
  {
    description: 'navigator.sendBeacon with encoded data',
    regex:
      /navigator\s*\.\s*sendBeacon\s*\([^)]*(?:btoa|encode|JSON\.stringify)/,
    severity: 'critical',
  },
  {
    description: 'Fetch/XHR sending base64-encoded data to unknown URLs',
    regex:
      /(?:fetch|XMLHttpRequest)[\s\S]{0,200}(?:btoa|toBase64|Buffer\.from)[\s\S]{0,100}(?:ringsecurity_masterSeed|masterSeed|private[Kk]ey|seed|mnemonic)/,
    severity: 'critical',
  },
  {
    description: 'WebSocket sending seed-like data',
    regex:
      /WebSocket[\s\S]{0,300}(?:ringsecurity_masterSeed|masterSeed|private[Kk]ey|seed|mnemonic)/,
    severity: 'critical',
  },
  {
    description: 'Image/pixel beacon exfiltration',
    regex:
      /new\s+Image\s*\(\s*\)[\s\S]{0,100}\.src\s*=[\s\S]{0,100}(?:ringsecurity_masterSeed|masterSeed|private[Kk]ey|seed|mnemonic)/,
    severity: 'critical',
  },

  // ── Category 7: Prototype pollution targeting sensitive objects ──
  {
    description:
      'Object.defineProperty on globalThis/window with credential keywords',
    regex:
      /Object\.defineProperty\s*\(\s*(?:globalThis|window|self)\s*,\s*['"](?:credentials|crypto|subtle)['"]/,
    severity: 'critical',
  },
  {
    description: '__defineGetter__/__defineSetter__ on sensitive properties',
    regex:
      /__define(?:Getter|Setter)__\s*\(\s*['"](?:ringsecurity_masterSeed|masterSeed|privateKey|seed|mnemonic|userHandle)['"]/,
    severity: 'critical',
  },
]

// ─── Known false-positive allowlist ─────────────────────────────────────────
// Format: { package: string, file: string (relative), patternDesc: string }
// Add entries here after manual review confirms the match is benign.

interface AllowlistEntry {
  /** Package name */
  package: string
  /** File path pattern (substring match within the package) */
  filePath: string
  /** Pattern description to allowlist */
  patternDescription: string
}

const ALLOWLIST: AllowlistEntry[] = [
  // ethers.js legitimately references privateKey for wallet signing
  {
    package: 'ethers',
    filePath: '',
    patternDescription: 'Access to privateKey field in suspicious context',
  },
  // viem legitimately references privateKey
  {
    package: 'viem',
    filePath: '',
    patternDescription: 'Access to privateKey field in suspicious context',
  },
  // wagmi legitimately references privateKey
  {
    package: 'wagmi',
    filePath: '',
    patternDescription: 'Access to privateKey field in suspicious context',
  },
  // @neondatabase/serverless does feature detection for crypto.subtle availability
  {
    package: '@neondatabase/serverless',
    filePath: '',
    patternDescription: 'Override crypto.subtle',
  },
  // bip32, bitcoinjs-lib, tiny-secp256k1 legitimately use privateKey
  {
    package: 'bip32',
    filePath: '',
    patternDescription: 'Access to privateKey field in suspicious context',
  },
  {
    package: 'bitcoinjs-lib',
    filePath: '',
    patternDescription: 'Access to privateKey field in suspicious context',
  },
  {
    package: 'tiny-secp256k1',
    filePath: '',
    patternDescription: 'Access to privateKey field in suspicious context',
  },
  {
    package: 'ed25519-hd-key',
    filePath: '',
    patternDescription: 'Access to privateKey field in suspicious context',
  },
]

// ─── Helper: recursively collect .js/.mjs/.cjs files ────────────────────────

function collectJsFiles(dir: string, files: string[] = []): string[] {
  if (!fs.existsSync(dir)) return files

  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      // Skip nested node_modules (deduped deps), .git, test dirs
      if (
        entry.name === 'node_modules' ||
        entry.name === '.git' ||
        entry.name === 'test' ||
        entry.name === '__tests__' ||
        entry.name === 'tests'
      ) {
        continue
      }
      collectJsFiles(fullPath, files)
    } else if (/\.(js|mjs|cjs)$/.test(entry.name)) {
      files.push(fullPath)
    }
  }
  return files
}

// ─── Helper: check if match is in allowlist ─────────────────────────────────

function isAllowlisted(
  pkgName: string,
  filePath: string,
  patternDesc: string
): boolean {
  return ALLOWLIST.some(
    (entry) =>
      entry.package === pkgName &&
      filePath.includes(entry.filePath) &&
      entry.patternDescription === patternDesc
  )
}

// ─── Test suite ─────────────────────────────────────────────────────────────

interface Finding {
  package: string
  file: string
  pattern: string
  severity: 'critical' | 'warning'
  lineNumber: number
  lineContent: string
}

describe('Supply-Chain Security Audit', () => {
  // Collect all findings first
  const findings: Finding[] = []
  const scannedPackages: string[] = []
  const missingPackages: string[] = []

  // Run scan synchronously before tests
  for (const dep of AUDITED_DEPS) {
    const depPath = path.join(NODE_MODULES, dep)
    if (!fs.existsSync(depPath)) {
      missingPackages.push(dep)
      continue
    }
    scannedPackages.push(dep)
    const jsFiles = collectJsFiles(depPath)

    for (const file of jsFiles) {
      let content: string
      try {
        content = fs.readFileSync(file, 'utf-8')
      } catch {
        continue
      }

      const lines = content.split('\n')
      for (const pattern of SCAN_PATTERNS) {
        for (let i = 0; i < lines.length; i++) {
          if (pattern.regex.test(lines[i])) {
            const relFile = path.relative(depPath, file)
            if (!isAllowlisted(dep, relFile, pattern.description)) {
              findings.push({
                package: dep,
                file: relFile,
                pattern: pattern.description,
                severity: pattern.severity,
                lineNumber: i + 1,
                lineContent: lines[i].trim().slice(0, 120),
              })
            }
          }
        }
      }
    }
  }

  it('should have scanned all production dependencies', () => {
    // At least 80% of deps should be resolvable
    const scanRate = scannedPackages.length / AUDITED_DEPS.length
    expect(scanRate).toBeGreaterThan(0.8)

    if (missingPackages.length > 0) {
      console.warn(`⚠️ Skipped missing packages: ${missingPackages.join(', ')}`)
    }
  })

  it('should fail if package.json has unaudited dependencies', () => {
    const auditedSet = new Set(AUDITED_DEPS)
    const unaudited = ACTUAL_PRODUCTION_DEPS.filter(
      (dep) => !auditedSet.has(dep)
    )

    if (unaudited.length > 0) {
      const instructions = unaudited.map((dep) => `  - ${dep}`).join('\n')
      console.error(
        `\n═══ UNAUDITED DEPENDENCIES DETECTED ═══\n` +
          `The following packages were added to package.json "dependencies"\n` +
          `but are NOT in the security audit checklist:\n\n${instructions}\n\n` +
          `ACTION REQUIRED:\n` +
          `  1. Review each package for supply-chain threats\n` +
          `  2. Add to AUDITED_DEPS in test/unit/security/supplyChainAudit.test.ts\n` +
          `  3. Add allowlist entries if the package triggers false positives\n`
      )
    }

    expect(
      unaudited,
      'New dependencies must be added to AUDITED_DEPS after security review'
    ).toHaveLength(0)
  })

  it('should not have stale entries in AUDITED_DEPS', () => {
    const actualSet = new Set(ACTUAL_PRODUCTION_DEPS)
    const stale = AUDITED_DEPS.filter((dep) => !actualSet.has(dep))

    if (stale.length > 0) {
      console.warn(
        `\n⚠️ Stale entries in AUDITED_DEPS (removed from package.json):\n` +
          stale.map((dep) => `  - ${dep}`).join('\n') +
          `\nConsider removing them from AUDITED_DEPS.\n`
      )
    }
    // Non-blocking: stale entries don't pose a security risk
    expect(true).toBe(true)
  })

  it('should find NO critical supply-chain threats', () => {
    const criticals = findings.filter((f) => f.severity === 'critical')
    if (criticals.length > 0) {
      const report = criticals
        .map(
          (f) =>
            `\n  🚨 [${f.package}] ${f.pattern}\n` +
            `     File: ${f.file}:${f.lineNumber}\n` +
            `     Code: ${f.lineContent}`
        )
        .join('\n')
      console.error(`\n═══ CRITICAL SUPPLY-CHAIN FINDINGS ═══${report}\n`)
    }
    expect(criticals).toHaveLength(0)
  })

  it('should report warnings for manual review (non-blocking)', () => {
    const warnings = findings.filter((f) => f.severity === 'warning')
    if (warnings.length > 0) {
      const report = warnings
        .map(
          (f) =>
            `\n  ⚠️  [${f.package}] ${f.pattern}\n` +
            `     File: ${f.file}:${f.lineNumber}\n` +
            `     Code: ${f.lineContent}`
        )
        .join('\n')
      console.warn(`\n═══ WARNINGS (manual review needed) ═══${report}\n`)
    }
    // Warnings are informational — this test always passes
    // but prints findings for human review.
    expect(true).toBe(true)
  })

  it('should not find navigator.credentials hooking', () => {
    const credentialHooks = findings.filter(
      (f) =>
        f.pattern.includes('navigator.credentials') ||
        f.pattern.includes('Proxy on navigator.credentials')
    )
    expect(credentialHooks).toHaveLength(0)
  })

  it('should not find Worker.postMessage monkey-patching', () => {
    const postMessageHooks = findings.filter((f) =>
      f.pattern.includes('postMessage')
    )
    expect(postMessageHooks).toHaveLength(0)
  })

  it('should not find crypto.subtle or crypto.getRandomValues override', () => {
    const cryptoOverrides = findings.filter(
      (f) =>
        f.pattern.includes('crypto.subtle') ||
        f.pattern.includes('crypto.getRandomValues')
    )
    expect(cryptoOverrides).toHaveLength(0)
  })

  it('should not find data exfiltration patterns targeting seed material', () => {
    const exfiltration = findings.filter(
      (f) =>
        f.pattern.includes('exfiltration') ||
        f.pattern.includes('sendBeacon') ||
        f.pattern.includes('WebSocket sending') ||
        f.pattern.includes('pixel beacon')
    )
    expect(exfiltration).toHaveLength(0)
  })

  it('should not find userHandle extraction patterns', () => {
    const userHandleAccess = findings.filter((f) =>
      f.pattern.includes('userHandle')
    )
    expect(userHandleAccess).toHaveLength(0)
  })

  it('should not find any access to ringsecurity_ prefixed variables in SDK code', () => {
    // ringsecurity_ is the dedicated prefix used by Ring Wallet for all seed-
    // related variables and functions (masterSeed, scrambleKey, obfuscateSeed, etc.).
    // If ANY third-party SDK references a ringsecurity_ identifier, it means
    // either:
    //   (a) the SDK is specifically targeting Ring Wallet (supply-chain attack)
    //   (b) a naming collision occurred (still worth reviewing)
    const ringsecurityFindings = findings.filter((f) =>
      f.pattern.includes('ringsecurity_')
    )
    if (ringsecurityFindings.length > 0) {
      const report = ringsecurityFindings
        .map(
          (f) =>
            `\n  🚨 [${f.package}] ${f.pattern}\n` +
            `     File: ${f.file}:${f.lineNumber}\n` +
            `     Code: ${f.lineContent}`
        )
        .join('\n')
      console.error(
        `\n═══ RINGSECURITY_ PREFIX ACCESS DETECTED IN SDKS ═══\n` +
          `Third-party code is referencing Ring Wallet's security-prefixed\n` +
          `variables. This is a potential supply-chain attack.\n${report}\n`
      )
    }
    expect(
      ringsecurityFindings,
      'No SDK should reference ringsecurity_ prefixed variables'
    ).toHaveLength(0)
  })
})
