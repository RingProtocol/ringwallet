#!/usr/bin/env node
/**
 * Fetch open GitHub issues via GitHub REST API.
 * Usage:
 *   node scripts/fetch-issues.mjs
 *   node scripts/fetch-issues.mjs --limit 10
 *   node scripts/fetch-issues.mjs --labels "bug"
 *   node scripts/fetch-issues.mjs --json   (output raw JSON)
 */
import fs from 'fs'
import path from 'path'

const REPO = 'RingProtocol/ringwallet'

function loadEnv() {
  const envPath = path.join(process.cwd(), '.env')
  if (!fs.existsSync(envPath)) return {}
  const env = {}
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const eq = line.indexOf('=')
    if (eq < 0 || line.startsWith('#')) continue
    const key = line.slice(0, eq).trim()
    const val = line.slice(eq + 1).trim().replace(/^["']|["']$/g, '')
    env[key] = val
  }
  return env
}

function parseArgs() {
  const args = process.argv.slice(2)
  const opts = { limit: 20, labels: '', json: false }
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--limit': opts.limit = parseInt(args[++i], 10); break
      case '--labels': opts.labels = args[++i]; break
      case '--json': opts.json = true; break
    }
  }
  return opts
}

async function fetchIssues(token, { limit, labels }) {
  const params = new URLSearchParams({ state: 'open', per_page: limit })
  if (labels) params.set('labels', labels)
  const url = `https://api.github.com/repos/${REPO}/issues?${params}`

  const res = await fetch(url, {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'ringwallet-fetch-issues/1.0',
    },
  })

  if (!res.ok) {
    const data = await res.json()
    console.error(`❌ GitHub API error (${res.status}): ${data.message}`)
    process.exit(1)
  }

  const issues = await res.json()
  // Filter out pull requests (GitHub returns PRs in issues endpoint)
  return issues.filter(i => !i.pull_request)
}

// ── Main ──
const env = loadEnv()
const token = process.env.GITHUB_TOKEN || env.GITHUB_TOKEN
if (!token) {
  console.error('❌ GITHUB_TOKEN not found in env or .env file')
  process.exit(1)
}

const opts = parseArgs()
const issues = await fetchIssues(token, opts)

if (opts.json) {
  console.log(JSON.stringify(issues, null, 2))
  process.exit(0)
}

if (issues.length === 0) {
  console.log('✅ No open issues found.')
  process.exit(0)
}

console.log(`\n📋 Open Issues (${issues.length})\n${'─'.repeat(60)}`)
for (const issue of issues) {
  const labels = issue.labels.map(l => `[${l.name}]`).join(' ')
  const assignees = issue.assignees.map(a => a.login).join(', ')
  console.log(`\n#${issue.number} ${issue.title}`)
  if (labels) console.log(`   Labels: ${labels}`)
  if (assignees) console.log(`   Assignees: ${assignees}`)
  console.log(`   ${issue.html_url}`)
  if (issue.body) {
    const preview = issue.body.slice(0, 200).replace(/\n/g, ' ')
    console.log(`   ${preview}${issue.body.length > 200 ? '…' : ''}`)
  }
}
console.log(`\n${'─'.repeat(60)}`)
