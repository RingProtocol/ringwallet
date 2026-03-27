import { NextResponse } from 'next/server'
import { checkAdminAuth } from '@/server/admin-auth'
import { ensureDB, getDApps, createDApp } from '@/server/db'

export async function GET(request: Request) {
  const authErr = checkAdminAuth(request)
  if (authErr) return authErr

  try {
    await ensureDB()
    const dapps = await getDApps()
    return NextResponse.json({ dapps })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const authErr = checkAdminAuth(request)
  if (authErr) return authErr

  try {
    await ensureDB()
    const body = await request.json()
    const { name, url } = body
    if (!name || !url) {
      return NextResponse.json({ error: 'name, url are required' }, { status: 400 })
    }
    const rows = await createDApp(body)
    return NextResponse.json(rows[0], { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
