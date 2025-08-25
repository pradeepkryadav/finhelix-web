import { NextRequest, NextResponse } from 'next/server'
import { kv } from '@vercel/kv'
export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()
    if (typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ ok: false, error: 'Invalid email' }, { status: 400 })
    }

    // Prefer Vercel KV if env present
    const hasKV = !!process.env.KV_REST_API_URL && !!process.env.KV_REST_API_TOKEN
    if (hasKV) {
      //const { kv } = await import('@vercel/kv')
      await kv.sadd('waitlist:emails', email.toLowerCase())
      await kv.hset(`waitlist:email:${email.toLowerCase()}`, {
        email: email.toLowerCase(),
        ts: Date.now(),
        ua: req.headers.get('user-agent') || ''
      })
      return NextResponse.json({ ok: true, stored: 'kv' })
    }

    // Local dev fallback: write to /tmp/waitlist.csv (ephemeral)
    const fs = await import('fs/promises')
    const line = `${new Date().toISOString()},${email}\n`
    const path = process.env.LOCAL_WAITLIST_PATH || '/tmp/waitlist.csv'
    await fs.appendFile(path, line, 'utf8')
    return NextResponse.json({ ok: true, stored: 'file', path })
  } catch (e: any) {
    console.error(e)
    return NextResponse.json({ ok: false, error: e?.message || 'error' }, { status: 500 })
  }
}
