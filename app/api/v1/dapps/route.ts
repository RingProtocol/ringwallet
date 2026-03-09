import { NextResponse } from 'next/server'
import { ensureDB, getDApps, getCategories } from '@/server/db'

export async function GET() {
  try {
    await ensureDB()
    const [dapps, categories] = await Promise.all([
      getDApps({ status: 'active' }),
      getCategories(),
    ])
    return NextResponse.json({
      dapps,
      categories,
      updated_at: new Date().toISOString(),
    })
  } catch (err) {
    console.error('[API] /v1/dapps error:', (err as Error).message)
    return NextResponse.json({ error: 'Failed to fetch DApps' }, { status: 500 })
  }
}
