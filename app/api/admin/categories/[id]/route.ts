import { NextResponse } from 'next/server'
import { checkAdminAuth } from '@/server/admin-auth'
import { ensureDB, deleteCategory } from '@/server/db'

interface Params { params: Promise<{ id: string }> }

export async function DELETE(request: Request, { params }: Params) {
  const authErr = checkAdminAuth(request)
  if (authErr) return authErr

  try {
    await ensureDB()
    const { id } = await params
    const rows = await deleteCategory(id)
    if (rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ deleted: rows[0].id })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
