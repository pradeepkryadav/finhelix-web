import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const res = await fetch('https://www.nseindia.com/api/fiidiiTradeReact', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
        'Referer': 'https://www.nseindia.com/',
      },
      next: { revalidate: 0 },
    })
    if (!res.ok) return NextResponse.json({ error: `NSE returned ${res.status}` }, { status: 502 })
    const data = await res.json()

    const fii = data.find((d: { category: string }) => d.category === 'FII/FPI')
    const dii = data.find((d: { category: string }) => d.category === 'DII')

    return NextResponse.json({
      date: fii?.date ?? dii?.date ?? null,
      fii: fii ? { buy: parseFloat(fii.buyValue), sell: parseFloat(fii.sellValue), net: parseFloat(fii.netValue) } : null,
      dii: dii ? { buy: parseFloat(dii.buyValue), sell: parseFloat(dii.sellValue), net: parseFloat(dii.netValue) } : null,
    })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
