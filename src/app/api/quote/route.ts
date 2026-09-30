import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get('symbol')
  if (!symbol) return NextResponse.json({ error: 'symbol required' }, { status: 400 })

  try {
    const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=2d`
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      next: { revalidate: 60 }, // cache 60s
    })
    if (!res.ok) return NextResponse.json({ error: `Yahoo returned ${res.status}` }, { status: 502 })

    const data = await res.json()
    const meta = data?.chart?.result?.[0]?.meta
    if (!meta) return NextResponse.json({ error: 'No data' }, { status: 502 })

    const price: number = meta.regularMarketPrice
    const prev: number = meta.chartPreviousClose ?? meta.previousClose
    const change = ((price - prev) / prev) * 100

    return NextResponse.json({ price, change, symbol: meta.symbol, name: meta.longName ?? meta.shortName })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
