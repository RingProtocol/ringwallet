import { NextResponse } from 'next/server'
import { ensureDB, getDApps, getCategories, getDAppByApiKey } from '@/server/db'

export async function GET(request: Request) {
  try {
    await ensureDB()
    const [dapps, categories] = await Promise.all([
      getDApps({ status: 'active' }),
      getCategories(),
    ])

    const { searchParams } = new URL(request.url)
    const testApiKey = searchParams.get('testdapp')
    if (testApiKey) {
      const testDapp = await getDAppByApiKey(testApiKey)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (testDapp && !dapps.some((d: any) => d.id === testDapp.id)) {
        dapps.push(testDapp)
      }
    }

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
