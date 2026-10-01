import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

const US_SECTORS = [
  { name: 'Technology',    ticker: 'XLK' },
  { name: 'Financials',    ticker: 'XLF' },
  { name: 'Energy',        ticker: 'XLE' },
  { name: 'Healthcare',    ticker: 'XLV' },
  { name: 'Consumer Disc', ticker: 'XLY' },
  { name: 'Industrials',   ticker: 'XLI' },
  { name: 'Materials',     ticker: 'XLB' },
  { name: 'Utilities',     ticker: 'XLU' },
  { name: 'Real Estate',   ticker: 'XLRE' },
  { name: 'Staples',       ticker: 'XLP' },
]

const INDIA_SECTORS = [
  'NIFTY AUTO', 'NIFTY FMCG', 'NIFTY METAL', 'NIFTY PHARMA',
  'NIFTY REALTY', 'NIFTY MEDIA', 'NIFTY OIL & GAS', 'NIFTY ENERGY',
  'NIFTY INFRASTRUCTURE', 'NIFTY PSU BANK',
]

async function fetchYahoo(ticker: string) {
  const res = await fetch(
    `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=2d`,
    { headers: { 'User-Agent': 'Mozilla/5.0' }, next: { revalidate: 0 } }
  )
  if (!res.ok) throw new Error(`${res.status}`)
  const d = await res.json()
  const meta = d?.chart?.result?.[0]?.meta
  if (!meta) throw new Error('no meta')
  const price: number = meta.regularMarketPrice
  const prev: number = meta.chartPreviousClose ?? meta.previousClose
  const change = parseFloat((((price - prev) / prev) * 100).toFixed(2))
  return { price, change }
}

export async function GET() {
  // US sectors — parallel Yahoo fetches
  const usResults = await Promise.allSettled(
    US_SECTORS.map(async s => {
      const { price, change } = await fetchYahoo(s.ticker)
      return { name: s.name, ticker: s.ticker, price, change }
    })
  )
  const usSectors = usResults
    .map((r, i) => r.status === 'fulfilled'
      ? r.value
      : { name: US_SECTORS[i].name, ticker: US_SECTORS[i].ticker, price: null, change: null })

  // India sectors — NSE allIndices
  let indiaSectors: { name: string; last: number; change: number }[] = []
  try {
    const nseRes = await fetch('https://www.nseindia.com/api/allIndices', {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json', 'Referer': 'https://www.nseindia.com/' },
      next: { revalidate: 0 },
    })
    if (nseRes.ok) {
      const nseData = await nseRes.json()
      indiaSectors = nseData.data
        .filter((i: { index: string }) => INDIA_SECTORS.includes(i.index))
        .map((i: { index: string; last: number; percentChange: number }) => ({
          name: i.index.replace('NIFTY ', '').replace('& GAS', '& Gas'),
          last: i.last,
          change: i.percentChange,
        }))
    }
  } catch { /* return empty */ }

  return NextResponse.json({ usSectors, indiaSectors })
}
