#!/usr/bin/env node
import fs from 'fs'
import path from 'path'
import http from 'http'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = __dirname
const distDir = path.join(root, 'dist-extension')
const port = 9877

// ── 0. Ensure dist-extension exists ──
if (!fs.existsSync(distDir)) {
  console.error('❌ dist-extension/ not found. Run: yarn ext:build')
  process.exit(1)
}

// ── 1. Static file server ──
const mime = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.wasm': 'application/wasm',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
}
const server = http.createServer((req, res) => {
  let url = req.url
  if (url === '/') url = '/popup.html'
  const file = path.join(distDir, decodeURIComponent(url))
  if (!file.startsWith(distDir)) {
    res.writeHead(403)
    res.end()
    return
  }
  fs.readFile(file, (err, data) => {
    if (err) {
      res.writeHead(404)
      res.end('Not found')
      return
    }
    const ext = path.extname(file)
    res.writeHead(200, { 'Content-Type': mime[ext] || 'application/octet-stream' })
    res.end(data)
  })
})
await new Promise((r) => server.listen(port, r))
console.log(`🌐 Server running at http://localhost:${port}/popup.html`)

// ── 2. Launch Playwright ──
let chromium
for (const pkg of ['playwright', '@playwright/test']) {
  try {
    ;({ chromium } = await import(pkg))
    break
  } catch {
    // try next
  }
}
if (!chromium) {
  console.error('❌ Playwright not found. Install with: yarn add -D playwright')
  process.exit(1)
}

const browser = await chromium.launch()
const context = await browser.newContext({ viewport: { width: 380, height: 600 } })
const page = await context.newPage()

const errors = []
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(msg.text())
})
page.on('pageerror', (err) => errors.push(err.message))

// ── 3. Virtual Authenticator setup ──
const cdp = await context.newCDPSession(page)
await cdp.send('WebAuthn.enable', { enableUI: false })

const { subtle } = await import('crypto')
const keyPair = await subtle.generateKey(
  { name: 'ECDSA', namedCurve: 'P-256' },
  true,
  ['sign']
)
const pkcs8 = await subtle.exportKey('pkcs8', keyPair.privateKey)
const privateKeyBase64 = Buffer.from(pkcs8).toString('base64')

const { authenticatorId } = await cdp.send('WebAuthn.addVirtualAuthenticator', {
  options: {
    protocol: 'ctap2',
    transport: 'internal',
    hasResidentKey: true,
    hasUserVerification: true,
    isUserVerified: true,
  },
})

const masterSeed = 'fffcf9f6f3f0edeae7e4e1dedbd8d5d2cfccc9c6c3c0bdbab7b4b1aeaba8a5a2'
const credentialIdHex = 'e2e00000000000000000000000000e2e'
const credentialId = Buffer.from(credentialIdHex, 'hex').toString('base64')
const userHandle = Buffer.concat([
  Buffer.from(masterSeed, 'hex'),
  Buffer.from('E2E_TestWallet', 'utf-8'),
]).toString('base64')

await cdp.send('WebAuthn.addCredential', {
  authenticatorId,
  credential: {
    credentialId,
    rpId: 'localhost',
    privateKey: privateKeyBase64,
    userHandle,
    signCount: 0,
    isResidentCredential: true,
  },
})

// ── 4. Open popup and login ──
await page.goto(`http://localhost:${port}/popup.html`)
await page.waitForTimeout(2000)

// Click login button ("I have a wallet")
const loginBtn = page.locator('[data-testid="login-button"]')
if (await loginBtn.isVisible().catch(() => false)) {
  await loginBtn.click()
  console.log('🔑 Clicked login button')
} else {
  console.log('ℹ️ Login button not visible (might already be logged in or different state)')
}

// Wait for wallet main page to appear
await page.waitForSelector('[data-testid="balance-amount"]', { timeout: 20000 }).catch(() => {
  console.log('⚠️ Balance amount not found after 20s')
})
await page.waitForTimeout(3000)

// ── 5. Click Earn button ──
const earnBtn = page.locator('[data-testid="earn-button"]')
if (await earnBtn.isVisible().catch(() => false)) {
  await earnBtn.click()
  console.log('💰 Clicked earn button')
} else {
  console.log('⚠️ Earn button not visible')
}

// Wait for EarnPage to render
await page.waitForTimeout(3000)

// ── 6. Screenshot and inspect ──
const screenshotPath = path.join(root, 'verify-earn-screenshot.png')
await page.screenshot({ path: screenshotPath, fullPage: false })

const info = await page.evaluate(() => {
  const root = document.getElementById('root')
  const earnPage = document.querySelector('.earn-page')
  const earnTitle = document.querySelector('.earn-page span')?.textContent || ''
  const strategyCards = document.querySelectorAll('.earn-strategy-card').length
  const positions = document.querySelectorAll('.earn-position-row').length
  const stakeBtn = document.querySelectorAll('.earn-stake-btn').length
  const bodyText = document.body.innerText.trim()
  return {
    rootExists: !!root,
    rootChildCount: root ? root.children.length : 0,
    earnPageExists: !!earnPage,
    earnTitle,
    strategyCards,
    positions,
    stakeBtn,
    bodyTextLength: bodyText.length,
    bodyTextSnippet: bodyText.slice(0, 500),
    hasErrorText: bodyText.toLowerCase().includes('error') || bodyText.toLowerCase().includes('fail'),
  }
})

// ── 7. Cleanup authenticator ──
try {
  await cdp.send('WebAuthn.removeVirtualAuthenticator', { authenticatorId })
  await cdp.send('WebAuthn.disable')
} catch {
  // ignore
}
await cdp.detach()

await browser.close()
server.close()

// ── 8. Report ──
const stats = fs.statSync(screenshotPath)
const fileSizeKB = Math.round(stats.size / 1024)

console.log('')
console.log('=== Earn Feature Verification ===')
console.log(`Screenshot : ${screenshotPath} (${fileSizeKB} KB)`)
console.log(`#root kids : ${info.rootChildCount}`)
console.log(`Earn page  : ${info.earnPageExists ? '✅ found' : '❌ not found'}`)
console.log(`Title text : ${info.earnTitle || 'N/A'}`)
console.log(`Strategies : ${info.strategyCards} cards`)
console.log(`Positions  : ${info.positions}`)
console.log(`Stake btns : ${info.stakeBtn}`)
console.log(`Text chars : ${info.bodyTextLength}`)
console.log(`Errors     : ${errors.length}`)
if (errors.length > 0) {
  errors.forEach((e) => console.log(`   🐛 ${e}`))
}

let failed = false
if (!info.earnPageExists) {
  console.error('❌ .earn-page element not found')
  failed = true
}
if (info.bodyTextLength === 0) {
  console.error('❌ No visible text detected')
  failed = true
}
if (info.hasErrorText) {
  console.error('❌ Error text detected in page')
  failed = true
}

console.log('')
console.log('Body text snippet:')
console.log(info.bodyTextSnippet)

if (failed) {
  console.error('\n❌ Earn verification FAILED')
  process.exit(1)
} else {
  console.log('\n✅ Earn verification PASSED')
}
