'use client';
import Link from 'next/link';

const indices = [
  { name: 'S&P 500', ticker: 'SPX', score: 68, label: 'Greed', change: '+1.2%', color: 'emerald' },
  { name: 'NASDAQ', ticker: 'NDX', score: 72, label: 'Greed', change: '+1.8%', color: 'emerald' },
  { name: 'Dow Jones', ticker: 'DJI', score: 55, label: 'Neutral', change: '+0.4%', color: 'sky' },
  { name: 'Russell 2000', ticker: 'RUT', score: 41, label: 'Fear', change: '-0.6%', color: 'amber' },
];

const signals = [
  { label: 'Put/Call Ratio', value: '0.82', sentiment: 'Bullish', desc: 'More calls than puts — market leans optimistic.' },
  { label: 'VIX (Fear Index)', value: '14.3', sentiment: 'Low Fear', desc: 'Below 20 indicates calm, risk-on environment.' },
  { label: 'CNN Fear & Greed', value: '68 / 100', sentiment: 'Greed', desc: 'Investors pricing in continued upside momentum.' },
  { label: 'AAII Bull Ratio', value: '52%', sentiment: 'Bullish', desc: 'Over half of retail investors expect gains in 6 months.' },
  { label: 'Insider Buying', value: 'Elevated', sentiment: 'Bullish', desc: 'Corporate insiders net buyers for the 3rd consecutive week.' },
  { label: 'Short Interest', value: '2.1%', sentiment: 'Neutral', desc: 'Short interest near 52-week lows across S&P 500.' },
];

const headlines = [
  { source: 'Reuters', time: '2h ago', title: 'Fed signals patience on rate cuts amid resilient labor market', sentiment: 'Neutral' },
  { source: 'Bloomberg', time: '4h ago', title: 'Tech earnings beat estimates for fifth consecutive quarter', sentiment: 'Bullish' },
  { source: 'CNBC', time: '5h ago', title: 'Oil prices dip on demand concerns from China slowdown data', sentiment: 'Bearish' },
  { source: 'WSJ', time: '7h ago', title: 'Consumer confidence index rises to highest level since 2022', sentiment: 'Bullish' },
  { source: 'FT', time: '9h ago', title: 'European markets cautious ahead of ECB policy decision', sentiment: 'Neutral' },
];

const sentimentColor: Record<string, string> = {
  Bullish: 'text-emerald-400 bg-emerald-400/10',
  Bearish: 'text-red-400 bg-red-400/10',
  Neutral: 'text-slate-300 bg-white/5',
  Greed: 'text-emerald-400 bg-emerald-400/10',
  'Low Fear': 'text-sky-400 bg-sky-400/10',
  Fear: 'text-amber-400 bg-amber-400/10',
};

function GaugeMeter({ score }: { score: number }) {
  const pct = Math.min(Math.max(score, 0), 100);
  const angle = -90 + (pct / 100) * 180;
  const r = 60;
  const cx = 80;
  const cy = 80;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const needleX = cx + r * Math.cos(toRad(angle - 90));
  const needleY = cy + r * Math.sin(toRad(angle - 90));

  return (
    <svg viewBox="0 0 160 100" className="w-full max-w-[180px]">
      {/* Track */}
      <path d="M20 80 A60 60 0 0 1 140 80" stroke="#1e293b" strokeWidth="12" fill="none" strokeLinecap="round" />
      {/* Fear zone */}
      <path d="M20 80 A60 60 0 0 1 53 27" stroke="#f59e0b" strokeWidth="12" fill="none" strokeLinecap="round" />
      {/* Neutral zone */}
      <path d="M53 27 A60 60 0 0 1 107 27" stroke="#38bdf8" strokeWidth="12" fill="none" strokeLinecap="round" />
      {/* Greed zone */}
      <path d="M107 27 A60 60 0 0 1 140 80" stroke="#34d399" strokeWidth="12" fill="none" strokeLinecap="round" />
      {/* Needle */}
      <line x1={cx} y1={cy} x2={needleX} y2={needleY} stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx={cx} cy={cy} r="4" fill="white" />
      {/* Score */}
      <text x={cx} y={cy + 18} textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">{score}</text>
    </svg>
  );
}

export default function SentimentPage() {
  const overall = 62;
  const overallLabel = overall >= 60 ? 'Greed' : overall >= 45 ? 'Neutral' : 'Fear';

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur supports-[backdrop-filter]:bg-slate-900/60 border-b border-white/10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-sky-500 via-indigo-500 to-emerald-500 grid place-items-center shadow-lg shadow-indigo-900/30">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.75">
                  <path d="M7 4c7 0 10 16 3 16"/>
                  <path d="M17 4c-7 0-10 16-3 16"/>
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
        {/* Page title */}
        <div>
          <h1 className="text-3xl md:text-4xl font-bold">Market Sentiment Analysis</h1>
          <p className="mt-2 text-slate-400">Real-time read on fear, greed, and momentum across major indices and indicators.</p>
        </div>

        {/* Overall gauge + index cards */}
        <div className="grid md:grid-cols-3 gap-6">
          {/* Gauge */}
          <div className="md:col-span-1 rounded-2xl border border-white/10 bg-white/5 p-6 flex flex-col items-center justify-center">
            <p className="text-sm text-slate-400 mb-2">Overall Market Sentiment</p>
            <GaugeMeter score={overall} />
            <p className="mt-2 text-2xl font-bold">{overallLabel}</p>
            <p className="text-slate-400 text-sm mt-1">Score: {overall} / 100</p>
          </div>

          {/* Index cards */}
          <div className="md:col-span-2 grid grid-cols-2 gap-4">
            {indices.map((idx) => (
              <div key={idx.ticker} className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-slate-400">{idx.name}</p>
                    <p className="text-lg font-semibold mt-0.5">{idx.ticker}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${sentimentColor[idx.label]}`}>{idx.label}</span>
                </div>
                <div className="mt-4">
                  <div className="flex justify-between text-xs text-slate-400 mb-1">
                    <span>Sentiment score</span>
                    <span>{idx.score}/100</span>
                  </div>
                  <div className="h-1.5 w-full rounded bg-white/10">
                    <div
                      className={`h-1.5 rounded ${idx.color === 'emerald' ? 'bg-emerald-400' : idx.color === 'sky' ? 'bg-sky-400' : 'bg-amber-400'}`}
                      style={{ width: `${idx.score}%` }}
                    />
                  </div>
                </div>
                <p className={`mt-3 text-sm font-medium ${idx.change.startsWith('+') ? 'text-emerald-400' : 'text-red-400'}`}>
                  {idx.change} today
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Key signals */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Key Indicators</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {signals.map((s) => (
              <div key={s.label} className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-slate-400">{s.label}</p>
                  <span className={`text-xs px-2 py-1 rounded-full ${sentimentColor[s.sentiment] ?? 'bg-white/5 text-slate-300'}`}>
                    {s.sentiment}
                  </span>
                </div>
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="mt-2 text-xs text-slate-400">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* News sentiment */}
        <div>
          <h2 className="text-xl font-semibold mb-4">News Sentiment</h2>
          <div className="rounded-2xl border border-white/10 bg-white/5 divide-y divide-white/10 overflow-hidden">
            {headlines.map((h, i) => (
              <div key={i} className="flex items-start justify-between gap-4 px-5 py-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium leading-snug">{h.title}</p>
                  <p className="mt-1 text-xs text-slate-400">{h.source} · {h.time}</p>
                </div>
                <span className={`shrink-0 text-xs px-2 py-1 rounded-full ${sentimentColor[h.sentiment]}`}>
                  {h.sentiment}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Disclaimer */}
        <p className="text-xs text-slate-500 pb-8">
          Sentiment data is for informational purposes only and does not constitute financial advice. Scores are illustrative and updated periodically.
        </p>
      </main>
    </div>
  );
}
