import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

const WANT = ['INDIA VIX', 'NIFTY 50', 'NIFTY BANK', 'NIFTY IT', 'NIFTY NEXT 50']

export async function GET() {
  try {
    const res = await fetch('https://www.nseindia.com/api/allIndices', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
        'Referer': 'https://www.nseindia.com/',
      },
      next: { revalidate: 0 },
    })
    if (!res.ok) return NextResponse.json({ error: `NSE returned ${res.status}` }, { status: 502 })
    const data = await res.json()

    const indices = data.data
      .filter((i: { index: string }) => WANT.includes(i.index))
      .map((i: { index: string; last: number; percentChange: number; previousClose: number }) => ({
        name: i.index,
        last: i.last,
        change: i.percentChange,
        prev: i.previousClose,
      }))

    return NextResponse.json({ indices })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
