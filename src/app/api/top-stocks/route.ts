import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

const US_STOCKS = [
  { ticker: 'AAPL',  name: 'Apple',    logo: '🍎' },
  { ticker: 'MSFT',  name: 'Microsoft',logo: '🪟' },
  { ticker: 'NVDA',  name: 'NVIDIA',   logo: '🟢' },
  { ticker: 'AMZN',  name: 'Amazon',   logo: '📦' },
  { ticker: 'GOOGL', name: 'Alphabet', logo: '🔍' },
]

const INDIA_STOCKS = [
  { ticker: 'RELIANCE.NS',  name: 'Reliance',   logo: '⚡' },
  { ticker: 'TCS.NS',       name: 'TCS',         logo: '💻' },
  { ticker: 'HDFCBANK.NS',  name: 'HDFC Bank',  logo: '🏦' },
  { ticker: 'INFY.NS',      name: 'Infosys',    logo: '🔷' },
  { ticker: 'ICICIBANK.NS', name: 'ICICI Bank', logo: '🏛️' },
]

async function fetchStock(ticker: string) {
  const res = await fetch(
    `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=2d`,
    { headers: { 'User-Agent': 'Mozilla/5.0' }, next: { revalidate: 120 } }
  )
  if (!res.ok) throw new Error(`${res.status}`)
  const d = await res.json()
  const meta = d?.chart?.result?.[0]?.meta
  if (!meta) throw new Error('no meta')
  const price: number = meta.regularMarketPrice
  const prev: number = meta.chartPreviousClose ?? meta.previousClose
  const change = parseFloat((((price - prev) / prev) * 100).toFixed(2))
  const mktCap: number | null = meta.marketCap ?? null
  return { price, change, mktCap }
}

export async function GET() {
  const [usResults, indiaResults] = await Promise.all([
    Promise.allSettled(US_STOCKS.map(async s => {
      const data = await fetchStock(s.ticker)
      return { ...s, ...data }
    })),
    Promise.allSettled(INDIA_STOCKS.map(async s => {
      const data = await fetchStock(s.ticker)
      return { ...s, ...data }
    })),
  ])

  const usStocks = usResults.map((r, i) =>
    r.status === 'fulfilled' ? r.value : { ...US_STOCKS[i], price: null, change: null, mktCap: null }
  )
  const indiaStocks = indiaResults.map((r, i) =>
    r.status === 'fulfilled' ? r.value : { ...INDIA_STOCKS[i], price: null, change: null, mktCap: null }
  )

  return NextResponse.json({ usStocks, indiaStocks })
}
