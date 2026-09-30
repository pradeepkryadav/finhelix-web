'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';

// ── types ──────────────────────────────────────────────────────────────────
interface IndexQuote {
  name: string;
  ticker: string;        // Yahoo Finance symbol
  displayTicker: string;
  region: 'us' | 'india';
  price: number | null;
  change: number | null;  // % change
  loading: boolean;
  error: boolean;
}

interface FearGreed {
  score: number | null;
  label: string;
  loading: boolean;
}

interface FiiDii {
  date: string | null;
  fii: { buy: number; sell: number; net: number } | null;
  dii: { buy: number; sell: number; net: number } | null;
  loading: boolean;
}

interface NseIndex {
  name: string;
  last: number;
  change: number;
}

interface Sector {
  name: string;
  ticker?: string;
  price?: number | null;
  last?: number;
  change: number | null;
}

interface Stock {
  name: string;
  ticker: string;
  logo: string;
  price: number | null;
  change: number | null;
  mktCap?: number | null;
}

// ── config ─────────────────────────────────────────────────────────────────
const INDEX_CONFIG: Omit<IndexQuote, 'price' | 'change' | 'loading' | 'error'>[] = [
  { name: 'S&P 500',      ticker: '^GSPC',    displayTicker: 'SPX',        region: 'us'    },
  { name: 'NASDAQ',       ticker: '^IXIC',    displayTicker: 'NDX',        region: 'us'    },
  { name: 'Dow Jones',    ticker: '^DJI',     displayTicker: 'DJI',        region: 'us'    },
  { name: 'Russell 2000', ticker: '^RUT',     displayTicker: 'RUT',        region: 'us'    },
  { name: 'Nifty 50',     ticker: '^NSEI',    displayTicker: 'NIFTY',      region: 'india' },
  { name: 'BSE Sensex',   ticker: '^BSESN',   displayTicker: 'SENSEX',     region: 'india' },
  { name: 'Nifty Bank',   ticker: '^NSEBANK', displayTicker: 'BANKNIFTY',  region: 'india' },
  { name: 'Nifty IT',     ticker: 'NIFTYIT.NS',displayTicker:'NIFTYIT',   region: 'india' },
];

// ── helpers ────────────────────────────────────────────────────────────────
function scoreFromChange(pct: number | null): number {
  if (pct === null) return 50;
  // Map -3%..+3% → 10..90
  const clamped = Math.min(Math.max(pct, -3), 3);
  return Math.round(50 + (clamped / 3) * 40);
}

function labelFromScore(score: number): string {
  if (score >= 65) return 'Greed';
  if (score >= 45) return 'Neutral';
  return 'Fear';
}

function colorFromScore(score: number): string {
  if (score >= 65) return 'emerald';
  if (score >= 45) return 'sky';
  return 'amber';
}

function fmtPrice(v: number, region: 'us' | 'india'): string {
  if (region === 'india') return v.toLocaleString('en-IN', { maximumFractionDigits: 0 });
  return v.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

function fmtChange(v: number | null): string {
  if (v === null) return '—';
  return (v >= 0 ? '+' : '') + v.toFixed(2) + '%';
}

async function fetchQuote(ticker: string): Promise<{ price: number; change: number }> {
  const res = await fetch(`/api/quote?symbol=${encodeURIComponent(ticker)}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`quote fetch failed: ${res.status}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return { price: data.price, change: data.change };
}

// ── gauge ──────────────────────────────────────────────────────────────────
function GaugeMeter({ score }: { score: number }) {
  const angle = -90 + (Math.min(Math.max(score, 0), 100) / 100) * 180;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const cx = 80, cy = 80, r = 60;
  const nx = cx + r * Math.cos(toRad(angle - 90));
  const ny = cy + r * Math.sin(toRad(angle - 90));
  return (
    <svg viewBox="0 0 160 100" className="w-full max-w-[180px]">
      <path d="M20 80 A60 60 0 0 1 140 80" stroke="#1e293b" strokeWidth="12" fill="none" strokeLinecap="round" />
      <path d="M20 80 A60 60 0 0 1 53 27"  stroke="#f59e0b" strokeWidth="12" fill="none" strokeLinecap="round" />
      <path d="M53 27 A60 60 0 0 1 107 27" stroke="#38bdf8" strokeWidth="12" fill="none" strokeLinecap="round" />
      <path d="M107 27 A60 60 0 0 1 140 80" stroke="#34d399" strokeWidth="12" fill="none" strokeLinecap="round" />
      <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx={cx} cy={cy} r="4" fill="white" />
      <text x={cx} y={cy + 18} textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">{score}</text>
    </svg>
  );
}

// ── sentiment colors ───────────────────────────────────────────────────────
const SC: Record<string, string> = {
  Bullish:   'text-emerald-400 bg-emerald-400/10',
  Bearish:   'text-red-400 bg-red-400/10',
  Neutral:   'text-slate-300 bg-white/5',
  Greed:     'text-emerald-400 bg-emerald-400/10',
  'Low Fear':'text-sky-400 bg-sky-400/10',
  Fear:      'text-amber-400 bg-amber-400/10',
};

// ── skeleton ───────────────────────────────────────────────────────────────
function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-white/10 ${className}`} />;
}

// ── index card ─────────────────────────────────────────────────────────────
function IndexCard({ q }: { q: IndexQuote }) {
  const score = scoreFromChange(q.change);
  const label = labelFromScore(score);
  const color = colorFromScore(score);
  const barColor = color === 'emerald' ? 'bg-emerald-400' : color === 'sky' ? 'bg-sky-400' : 'bg-amber-400';
  const changeColor = q.change === null ? 'text-slate-400' : q.change >= 0 ? 'text-emerald-400' : 'text-red-400';

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-slate-400">{q.name}</p>
          <p className="text-lg font-semibold mt-0.5">{q.displayTicker}</p>
        </div>
        {q.loading ? <Skeleton className="h-6 w-16" /> :
          <span className={`text-xs px-2 py-1 rounded-full ${SC[label]}`}>{label}</span>}
      </div>
      <div className="mt-2 text-xl font-bold">
        {q.loading ? <Skeleton className="h-7 w-28 mt-1" /> :
         q.error ? <span className="text-slate-500 text-sm">Unavailable</span> :
         q.price !== null ? fmtPrice(q.price, q.region) : '—'}
      </div>
      {!q.loading && !q.error && (
        <>
          <div className="mt-3">
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span>Sentiment score</span><span>{score}/100</span>
            </div>
            <div className="h-1.5 w-full rounded bg-white/10">
              <div className={`h-1.5 rounded ${barColor}`} style={{ width: `${score}%` }} />
            </div>
          </div>
          <p className={`mt-2 text-sm font-medium ${changeColor}`}>{fmtChange(q.change)} today</p>
        </>
      )}
      {q.loading && <Skeleton className="h-4 w-full mt-4" />}
    </div>
  );
}

// ── main page ──────────────────────────────────────────────────────────────
export default function SentimentPage() {
  const [quotes, setQuotes] = useState<IndexQuote[]>(
    INDEX_CONFIG.map(c => ({ ...c, price: null, change: null, loading: true, error: false }))
  );
  const [fg, setFg] = useState<FearGreed>({ score: null, label: 'Loading…', loading: true });
  const [fiiDii, setFiiDii] = useState<FiiDii>({ date: null, fii: null, dii: null, loading: true });
  const [vix, setVix] = useState<number | null>(null);
  const [usSectors, setUsSectors] = useState<Sector[]>([]);
  const [indiaSectors, setIndiaSectors] = useState<Sector[]>([]);
  const [usStocks, setUsStocks] = useState<Stock[]>([]);
  const [indiaStocks, setIndiaStocks] = useState<Stock[]>([]);
  const [sectorsLoading, setSectorsLoading] = useState(true);
  const [stocksLoading, setStocksLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  useEffect(() => {
    // Fear & Greed
    fetch('https://api.alternative.me/fng/?limit=1')
      .then(r => r.json())
      .then(d => {
        const score = parseInt(d.data[0].value, 10);
        setFg({ score, label: d.data[0].value_classification, loading: false });
      })
      .catch(() => setFg({ score: null, label: 'Unavailable', loading: false }));

    // FII / DII from NSE (via our proxy)
    fetch('/api/nse-fii')
      .then(r => r.json())
      .then(d => setFiiDii({ ...d, loading: false }))
      .catch(() => setFiiDii({ date: null, fii: null, dii: null, loading: false }));

    // India VIX + NSE index prices
    fetch('/api/nse-indices')
      .then(r => r.json())
      .then(d => {
        const vixEntry = d.indices?.find((i: NseIndex) => i.name === 'INDIA VIX');
        if (vixEntry) setVix(vixEntry.last);

        // Patch Nifty / Bank Nifty / IT from NSE (more accurate than Yahoo for INR)
        const nseMap: Record<string, NseIndex> = {};
        (d.indices ?? []).forEach((i: NseIndex) => { nseMap[i.name] = i; });

        setQuotes(prev => prev.map(q => {
          if (q.region !== 'india') return q;
          const match =
            q.displayTicker === 'NIFTY'      ? nseMap['NIFTY 50']   :
            q.displayTicker === 'BANKNIFTY'  ? nseMap['NIFTY BANK'] :
            q.displayTicker === 'NIFTYIT'    ? nseMap['NIFTY IT']   :
            null;
          if (!match) return q;
          return { ...q, price: match.last, change: match.change, loading: false, error: false };
        }));
      })
      .catch(() => {});

    // US + Sensex from Yahoo
    INDEX_CONFIG.forEach((cfg, i) => {
      if (['NIFTY', 'BANKNIFTY', 'NIFTYIT'].includes(cfg.displayTicker)) return; // covered by NSE
      fetchQuote(cfg.ticker)
        .then(({ price, change }) => {
          setQuotes(prev => prev.map((q, idx) =>
            idx === i ? { ...q, price, change, loading: false, error: false } : q
          ));
        })
        .catch(() => {
          setQuotes(prev => prev.map((q, idx) =>
            idx === i ? { ...q, loading: false, error: true } : q
          ));
        });
    });

    setLastUpdated(new Date().toLocaleTimeString());

    // Sectors
    fetch('/api/sectors')
      .then(r => r.json())
      .then(d => { setUsSectors(d.usSectors ?? []); setIndiaSectors(d.indiaSectors ?? []); })
      .catch(() => {})
      .finally(() => setSectorsLoading(false));

    // Top stocks
    fetch('/api/top-stocks')
      .then(r => r.json())
      .then(d => { setUsStocks(d.usStocks ?? []); setIndiaStocks(d.indiaStocks ?? []); })
      .catch(() => {})
      .finally(() => setStocksLoading(false));
  }, []);

  const usQuotes    = quotes.filter(q => q.region === 'us');
  const indiaQuotes = quotes.filter(q => q.region === 'india');

  const usAvgScore = usQuotes.every(q => !q.loading && !q.error)
    ? Math.round(usQuotes.reduce((s, q) => s + scoreFromChange(q.change), 0) / usQuotes.length)
    : 50;

  const indiaAvgScore = indiaQuotes.every(q => !q.loading && !q.error)
    ? Math.round(indiaQuotes.reduce((s, q) => s + scoreFromChange(q.change), 0) / indiaQuotes.length)
    : 50;

  const fgScore = fg.score ?? 50;

  // Overall = 60% price-derived + 40% fear & greed
  const overallScore = Math.round((usAvgScore * 0.6) + (fgScore * 0.4));

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur supports-[backdrop-filter]:bg-slate-900/60 border-b border-white/10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-sky-500 via-indigo-500 to-emerald-500 grid place-items-center shadow-lg shadow-indigo-900/30">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.75">
                  <path d="M7 4c7 0 10 16 3 16"/><path d="M17 4c-7 0-10 16-3 16"/>
                </svg>
              </div>
              <span className="text-xl font-semibold tracking-tight">FinHelix</span>
            </Link>
            <nav className="hidden md:flex items-center gap-8 text-sm text-slate-300">
              <Link href="/#features" className="hover:text-white">Features</Link>
              <Link href="/#security" className="hover:text-white">Security</Link>
              <Link href="/#pricing" className="hover:text-white">Pricing</Link>
              <Link href="/sentiment" className="text-white font-medium">Market Sentiment</Link>
            </nav>
            <Link href="/#waitlist" className="inline-flex rounded-xl px-4 py-2 bg-gradient-to-tr from-sky-500 via-indigo-500 to-emerald-500 text-white shadow-lg hover:opacity-90 transition text-sm">
              Join waitlist
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 space-y-12">
        {/* Title */}
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold">Market Sentiment Analysis</h1>
            <p className="mt-2 text-slate-400">Live prices fetched directly in your browser — no server involved.</p>
          </div>
          {lastUpdated && (
            <p className="text-xs text-slate-500 shrink-0">Updated {lastUpdated}</p>
          )}
        </div>

        {/* ── Overall gauge ── */}
        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-1 rounded-2xl border border-white/10 bg-white/5 p-6 flex flex-col items-center justify-center">
            <p className="text-sm text-slate-400 mb-2">Overall Market Sentiment</p>
            <GaugeMeter score={overallScore} />
            <p className="mt-2 text-2xl font-bold">{labelFromScore(overallScore)}</p>
            <p className="text-slate-400 text-sm mt-1">Score: {overallScore} / 100</p>
          </div>

          {/* Fear & Greed + US avg */}
          <div className="md:col-span-2 grid grid-cols-2 gap-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 flex flex-col justify-between">
              <p className="text-sm text-slate-400">CNN Fear &amp; Greed Index</p>
              {fg.loading
                ? <Skeleton className="h-10 w-20 mt-3" />
                : <p className="text-4xl font-bold mt-2">{fg.score ?? '—'}<span className="text-lg text-slate-400">/100</span></p>}
              <span className={`mt-3 self-start text-xs px-2 py-1 rounded-full ${SC[fg.label] ?? 'bg-white/5 text-slate-300'}`}>
                {fg.label}
              </span>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 flex flex-col justify-between">
              <p className="text-sm text-slate-400">US Market Score</p>
              <p className="text-4xl font-bold mt-2">{usAvgScore}<span className="text-lg text-slate-400">/100</span></p>
              <span className={`mt-3 self-start text-xs px-2 py-1 rounded-full ${SC[labelFromScore(usAvgScore)]}`}>
                {labelFromScore(usAvgScore)}
              </span>
            </div>
            <div className="col-span-2 rounded-2xl border border-white/10 bg-white/5 p-5">
              <p className="text-sm text-slate-400 mb-3">Score breakdown</p>
              <div className="space-y-2">
                {[
                  { label: 'Fear & Greed (40%)', score: fgScore },
                  { label: 'US Index Momentum (60%)', score: usAvgScore },
                ].map(item => (
                  <div key={item.label}>
                    <div className="flex justify-between text-xs text-slate-400 mb-1">
                      <span>{item.label}</span><span>{item.score}/100</span>
                    </div>
                    <div className="h-1.5 w-full rounded bg-white/10">
                      <div
                        className={`h-1.5 rounded ${colorFromScore(item.score) === 'emerald' ? 'bg-emerald-400' : colorFromScore(item.score) === 'sky' ? 'bg-sky-400' : 'bg-amber-400'}`}
                        style={{ width: `${item.score}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── US indices ── */}
        <div>
          <h2 className="text-xl font-semibold mb-4">🇺🇸 US Indices — Live Prices</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {usQuotes.map(q => <IndexCard key={q.ticker} q={q} />)}
          </div>
        </div>

        {/* ── Indian Market ── */}
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🇮🇳</span>
            <div>
              <h2 className="text-2xl font-bold">Indian Market Sentiment</h2>
              <p className="text-slate-400 text-sm mt-0.5">NSE · BSE · Nifty indices — live prices</p>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-1 rounded-2xl border border-orange-400/20 bg-orange-400/5 p-6 flex flex-col items-center justify-center">
              <p className="text-sm text-slate-400 mb-2">India Overall Sentiment</p>
              <GaugeMeter score={indiaAvgScore} />
              <p className="mt-2 text-2xl font-bold">{labelFromScore(indiaAvgScore)}</p>
              <p className="text-slate-400 text-sm mt-1">Score: {indiaAvgScore} / 100</p>
            </div>
            <div className="md:col-span-2 grid grid-cols-2 gap-4">
              {indiaQuotes.map(q => <IndexCard key={q.ticker} q={q} />)}
            </div>
          </div>

          {/* India static indicators */}
          <div>
            <h3 className="text-lg font-semibold mb-4">India Key Indicators</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

              {/* India VIX */}
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-slate-400">India VIX</p>
                  {vix !== null && (
                    <span className={`text-xs px-2 py-1 rounded-full ${vix < 15 ? SC['Low Fear'] : vix < 20 ? SC['Neutral'] : SC['Fear']}`}>
                      {vix < 15 ? 'Low Fear' : vix < 20 ? 'Neutral' : 'High Fear'}
                    </span>
                  )}
                </div>
                {vix === null ? <Skeleton className="h-8 w-24 mt-1" /> : <p className="text-2xl font-bold">{vix.toFixed(2)}</p>}
                <p className="mt-2 text-xs text-slate-400">Below 15 = calm. Above 20 = elevated fear. Live from NSE.</p>
              </div>

              {/* FII */}
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-slate-400">FII / FPI Net Flow</p>
                  {!fiiDii.loading && fiiDii.fii && (
                    <span className={`text-xs px-2 py-1 rounded-full ${fiiDii.fii.net >= 0 ? SC['Bullish'] : SC['Bearish']}`}>
                      {fiiDii.fii.net >= 0 ? 'Bullish' : 'Bearish'}
                    </span>
                  )}
                </div>
                {fiiDii.loading
                  ? <Skeleton className="h-8 w-32 mt-1" />
                  : fiiDii.fii
                    ? <>
                        <p className={`text-2xl font-bold ${fiiDii.fii.net >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {fiiDii.fii.net >= 0 ? '+' : ''}₹{fiiDii.fii.net.toLocaleString('en-IN')} Cr
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          Buy ₹{fiiDii.fii.buy.toLocaleString('en-IN')} Cr · Sell ₹{fiiDii.fii.sell.toLocaleString('en-IN')} Cr
                        </p>
                      </>
                    : <p className="text-slate-500 text-sm mt-1">Unavailable</p>
                }
                {fiiDii.date && <p className="mt-2 text-xs text-slate-500">NSE · {fiiDii.date}</p>}
              </div>

              {/* DII */}
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-slate-400">DII Net Flow</p>
                  {!fiiDii.loading && fiiDii.dii && (
                    <span className={`text-xs px-2 py-1 rounded-full ${fiiDii.dii.net >= 0 ? SC['Bullish'] : SC['Bearish']}`}>
                      {fiiDii.dii.net >= 0 ? 'Bullish' : 'Bearish'}
                    </span>
                  )}
                </div>
                {fiiDii.loading
                  ? <Skeleton className="h-8 w-32 mt-1" />
                  : fiiDii.dii
                    ? <>
                        <p className={`text-2xl font-bold ${fiiDii.dii.net >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {fiiDii.dii.net >= 0 ? '+' : ''}₹{fiiDii.dii.net.toLocaleString('en-IN')} Cr
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          Buy ₹{fiiDii.dii.buy.toLocaleString('en-IN')} Cr · Sell ₹{fiiDii.dii.sell.toLocaleString('en-IN')} Cr
                        </p>
                      </>
                    : <p className="text-slate-500 text-sm mt-1">Unavailable</p>
                }
                {fiiDii.date && <p className="mt-2 text-xs text-slate-500">NSE · {fiiDii.date}</p>}
              </div>

              {/* RBI Stance */}
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-slate-400">RBI Repo Rate</p>
                  <span className={`text-xs px-2 py-1 rounded-full ${SC['Neutral']}`}>Neutral</span>
                </div>
                <p className="text-2xl font-bold">6.5%</p>
                <p className="mt-2 text-xs text-slate-400">Rate unchanged. Inflation within 4–5% target band.</p>
              </div>

            </div>
          </div>
        </div>

        {/* ── Sector Performance ── */}
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold">Sector Performance</h2>
            <p className="text-slate-400 text-sm mt-0.5">Best and worst performing sectors today</p>
          </div>

          {/* US Sectors */}
          <div>
            <h3 className="text-lg font-semibold mb-3">🇺🇸 US Sectors</h3>
            {sectorsLoading
              ? <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">{Array.from({length:10}).map((_,i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}</div>
              : (() => {
                  const sorted = [...usSectors].sort((a,b) => (b.change??-99)-(a.change??-99));
                  const best = sorted[0];
                  const worst = sorted[sorted.length-1];
                  return (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {best && (
                          <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/5 p-4 flex items-center gap-4">
                            <div className="h-10 w-10 rounded-xl bg-emerald-400/20 grid place-items-center text-emerald-400 font-bold text-lg shrink-0">↑</div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-slate-400">Top Sector</p>
                              <p className="font-semibold">{best.name}</p>
                            </div>
                            <p className="text-emerald-400 font-bold text-lg">+{best.change?.toFixed(2)}%</p>
                          </div>
                        )}
                        {worst && (
                          <div className="rounded-2xl border border-red-400/30 bg-red-400/5 p-4 flex items-center gap-4">
                            <div className="h-10 w-10 rounded-xl bg-red-400/20 grid place-items-center text-red-400 font-bold text-lg shrink-0">↓</div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-slate-400">Worst Sector</p>
                              <p className="font-semibold">{worst.name}</p>
                            </div>
                            <p className="text-red-400 font-bold text-lg">{worst.change?.toFixed(2)}%</p>
                          </div>
                        )}
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                        {sorted.map(s => {
                          const up = (s.change ?? 0) >= 0;
                          return (
                            <div key={s.name} className="rounded-xl border border-white/10 bg-white/5 p-3">
                              <p className="text-xs text-slate-400 truncate">{s.name}</p>
                              <p className={`mt-1 font-semibold ${up ? 'text-emerald-400' : 'text-red-400'}`}>
                                {up ? '+' : ''}{s.change?.toFixed(2)}%
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()
            }
          </div>

          {/* India Sectors */}
          <div>
            <h3 className="text-lg font-semibold mb-3">🇮🇳 India Sectors</h3>
            {sectorsLoading
              ? <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">{Array.from({length:10}).map((_,i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}</div>
              : (() => {
                  const sorted = [...indiaSectors].sort((a,b) => (b.change??-99)-(a.change??-99));
                  const best = sorted[0];
                  const worst = sorted[sorted.length-1];
                  return (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {best && (
                          <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/5 p-4 flex items-center gap-4">
                            <div className="h-10 w-10 rounded-xl bg-emerald-400/20 grid place-items-center text-emerald-400 font-bold text-lg shrink-0">↑</div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-slate-400">Top Sector</p>
                              <p className="font-semibold">{best.name}</p>
                            </div>
                            <p className="text-emerald-400 font-bold text-lg">+{best.change?.toFixed(2)}%</p>
                          </div>
                        )}
                        {worst && (
                          <div className="rounded-2xl border border-red-400/30 bg-red-400/5 p-4 flex items-center gap-4">
                            <div className="h-10 w-10 rounded-xl bg-red-400/20 grid place-items-center text-red-400 font-bold text-lg shrink-0">↓</div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-slate-400">Worst Sector</p>
                              <p className="font-semibold">{worst.name}</p>
                            </div>
                            <p className="text-red-400 font-bold text-lg">{worst.change?.toFixed(2)}%</p>
                          </div>
                        )}
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                        {sorted.map(s => {
                          const up = (s.change ?? 0) >= 0;
                          return (
                            <div key={s.name} className="rounded-xl border border-white/10 bg-white/5 p-3">
                              <p className="text-xs text-slate-400 truncate">{s.name}</p>
                              <p className={`mt-1 font-semibold ${up ? 'text-emerald-400' : 'text-red-400'}`}>
                                {up ? '+' : ''}{s.change?.toFixed(2)}%
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()
            }
          </div>
        </div>

        {/* ── Top 5 Companies ── */}
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold">Top 5 Companies</h2>
            <p className="text-slate-400 text-sm mt-0.5">Live price &amp; today&apos;s change</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* US */}
            <div>
              <h3 className="text-lg font-semibold mb-3">🇺🇸 United States</h3>
              <div className="rounded-2xl border border-white/10 bg-white/5 divide-y divide-white/10 overflow-hidden">
                {stocksLoading
                  ? Array.from({length:5}).map((_,i) => <div key={i} className="px-5 py-4"><Skeleton className="h-10 w-full" /></div>)
                  : usStocks.map(s => {
                      const up = (s.change ?? 0) >= 0;
                      return (
                        <div key={s.ticker} className="flex items-center gap-4 px-5 py-4">
                          <span className="text-2xl w-8 text-center shrink-0">{s.logo}</span>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium">{s.name}</p>
                            <p className="text-xs text-slate-400">{s.ticker}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="font-semibold">${s.price?.toLocaleString('en-US', {maximumFractionDigits:2})}</p>
                            <p className={`text-sm ${up ? 'text-emerald-400' : 'text-red-400'}`}>
                              {up ? '+' : ''}{s.change?.toFixed(2)}%
                            </p>
                          </div>
                        </div>
                      );
                    })
                }
              </div>
            </div>

            {/* India */}
            <div>
              <h3 className="text-lg font-semibold mb-3">🇮🇳 India</h3>
              <div className="rounded-2xl border border-white/10 bg-white/5 divide-y divide-white/10 overflow-hidden">
                {stocksLoading
                  ? Array.from({length:5}).map((_,i) => <div key={i} className="px-5 py-4"><Skeleton className="h-10 w-full" /></div>)
                  : indiaStocks.map(s => {
                      const up = (s.change ?? 0) >= 0;
                      return (
                        <div key={s.ticker} className="flex items-center gap-4 px-5 py-4">
                          <span className="text-2xl w-8 text-center shrink-0">{s.logo}</span>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium">{s.name}</p>
                            <p className="text-xs text-slate-400">{s.ticker.replace('.NS','')}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="font-semibold">₹{s.price?.toLocaleString('en-IN', {maximumFractionDigits:1})}</p>
                            <p className={`text-sm ${up ? 'text-emerald-400' : 'text-red-400'}`}>
                              {up ? '+' : ''}{s.change?.toFixed(2)}%
                            </p>
                          </div>
                        </div>
                      );
                    })
                }
              </div>
            </div>
          </div>
        </div>

        {/* Disclaimer */}
        <p className="text-xs text-slate-500 pb-8">
          Index prices via Yahoo Finance · FII/DII &amp; India VIX via NSE India · Fear &amp; Greed via Alternative.me. For informational purposes only — not financial advice.
        </p>
      </main>
    </div>
  );
}
