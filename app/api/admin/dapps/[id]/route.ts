import { NextResponse } from 'next/server'
import { checkAdminAuth } from '@/server/admin-auth'
import { ensureDB, getDAppById, updateDApp, deleteDApp } from '@/server/db'

interface Params { params: Promise<{ id: string }> }

function parseId(id: string): number | null {
  const n = parseInt(id, 10)
  return Number.isNaN(n) ? null : n
}

export async function GET(request: Request, { params }: Params) {
  const authErr = checkAdminAuth(request)
  if (authErr) return authErr

  try {
    await ensureDB()
    const { id: idParam } = await params
    const id = parseId(idParam)
    if (id === null) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
    const dapp = await getDAppById(id)
    if (!dapp) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(dapp)
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}

export async function PUT(request: Request, { params }: Params) {
  const authErr = checkAdminAuth(request)
  if (authErr) return authErr

  try {
    await ensureDB()
    const { id: idParam } = await params
    const id = parseId(idParam)
    if (id === null) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
    const body = await request.json()
    const rows = await updateDApp(id, body)
    if (!rows) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(rows[0])
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: Params) {
  const authErr = checkAdminAuth(request)
  if (authErr) return authErr

  try {
    await ensureDB()
    const { id: idParam } = await params
    const id = parseId(idParam)
    if (id === null) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
    const rows = await deleteDApp(id)
    if (rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ deleted: rows[0].id })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
