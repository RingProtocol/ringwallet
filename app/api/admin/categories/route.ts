import { NextResponse } from 'next/server'
import { checkAdminAuth } from '@/server/admin-auth'
import { ensureDB, getCategories, upsertCategory } from '@/server/db'

export async function GET(request: Request) {
  const authErr = checkAdminAuth(request)
  if (authErr) return authErr

  try {
    await ensureDB()
    const categories = await getCategories()
    return NextResponse.json({ categories })
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
    const { id, name } = body
    if (!id || !name) return NextResponse.json({ error: 'id, name are required' }, { status: 400 })
    const rows = await upsertCategory(body)
    return NextResponse.json(rows[0], { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
