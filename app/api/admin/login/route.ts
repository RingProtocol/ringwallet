import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const token = body?.token
    const expected = process.env.ADMIN_TOKEN
    if (!expected) {
      return NextResponse.json({ error: 'Admin not configured' }, { status: 503 })
    }
    if (!token || token !== expected) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  }
}
