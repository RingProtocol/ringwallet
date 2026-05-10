import { existsSync, readFileSync, unlinkSync } from 'fs'
import { ANVIL_PIDS_FILE } from './global-setup'

export default async function globalTeardown(): Promise<void> {
  if (!existsSync(ANVIL_PIDS_FILE)) return

  const pids: number[] = JSON.parse(readFileSync(ANVIL_PIDS_FILE, 'utf8'))
  for (const pid of pids) {
    try {
      // SIGTERM → start-anvil.mjs handler kills anvil child then exits cleanly
      process.kill(pid, 'SIGTERM')
      console.log(`[globalTeardown] sent SIGTERM to anvil wrapper (pid=${pid})`)
    } catch {
      // Process already gone — nothing to do
    }
  }

  unlinkSync(ANVIL_PIDS_FILE)
}
