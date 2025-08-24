'use client';
export default function FinHelixLanding() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      {/* Top Bar */}
      <header className="sticky top-0 z-40 backdrop-blur supports-[backdrop-filter]:bg-slate-900/60 border-b border-white/10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-sky-500 via-indigo-500 to-emerald-500 grid place-items-center shadow-lg shadow-indigo-900/30">
                {/* Simple Helix mark */}
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.75">
                  <path d="M7 4c7 0 10 16 3 16"/>
                  <path d="M17 4c-7 0-10 16-3 16"/>
                </svg>
              </div>
              <span className="text-xl font-semibold tracking-tight">FinHelix</span>
            </div>
            <nav className="hidden md:flex items-center gap-8 text-sm text-slate-300">
              <a href="#features" className="hover:text-white">Features</a>
              <a href="#security" className="hover:text-white">Security</a>
              <a href="#pricing" className="hover:text-white">Pricing</a>
              <a href="#faq" className="hover:text-white">FAQ</a>
            </nav>
            <div className="flex items-center gap-3">
              <a href="#waitlist" className="hidden sm:inline-flex rounded-xl px-4 py-2 bg-white/10 hover:bg-white/20 transition">Sign in</a>
              <a href="#waitlist" className="inline-flex rounded-xl px-4 py-2 bg-gradient-to-tr from-sky-500 via-indigo-500 to-emerald-500 text-white shadow-lg hover:opacity-90 transition">Join waitlist</a>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 h-72 w-[40rem] rounded-full bg-sky-500/20 blur-3xl"/>
          <div className="absolute top-40 right-10 h-48 w-48 rounded-full bg-indigo-500/20 blur-3xl"/>
        </div>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="py-20 md:py-28 grid md:grid-cols-2 items-center gap-10">
            <div>
              <h1 className="text-4xl md:text-6xl font-bold leading-tight">
                Your net worth, unified.
              </h1>
              <p className="mt-4 text-lg text-slate-300">
                FinHelix connects banking, cards, loans, insurance, HSA, brokerage, and even beginner‑friendly options strategies into one secure, beautiful app.
              </p>
              {/* Waitlist form (stub) */}
              <form
                id="waitlist"
                className="mt-8 flex w-full max-w-lg rounded-2xl border border-white/10 bg-white/5 p-2 backdrop-blur"
                onSubmit={(e) => { e.preventDefault(); const email = (e.currentTarget.elements.namedItem('email') as HTMLInputElement)?.value; alert(`Thanks! We'll be in touch at ${email}`); }}
              >
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="you@finhelix.app"
                  className="w-full rounded-xl bg-transparent px-4 py-3 text-slate-100 placeholder:text-slate-400 focus:outline-none"
                />
                <button className="shrink-0 rounded-xl bg-gradient-to-tr from-sky-500 via-indigo-500 to-emerald-500 px-5 py-3 font-medium shadow-lg hover:opacity-90">
                  Join
                </button>
              </form>
              <p className="mt-3 text-sm text-slate-400">Private beta • No spam • Cancel anytime</p>
            </div>
            <div className="relative">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl">
                {/* Mock dashboard card */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl bg-black/20 p-5">
                    <p className="text-sm text-slate-400">Net worth</p>
                    <p className="mt-2 text-3xl font-semibold">$842,190</p>
                    <p className="mt-1 text-emerald-400 text-sm">+2.4% this month</p>
                  </div>
                  <div className="rounded-2xl bg-black/20 p-5">
                    <p className="text-sm text-slate-400">Cash & Cards</p>
                    <p className="mt-2 text-xl">$41,320</p>
                    <div className="mt-3 h-2 w-full rounded bg-white/10">
                      <div className="h-2 w-2/3 rounded bg-sky-500" />
                    </div>
                  </div>
                  <div className="rounded-2xl bg-black/20 p-5 md:col-span-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-slate-400">Options coach — Covered call payoff</p>
                      <span className="text-xs text-slate-400">AAPL 100Δ ~30DTE</span>
                    </div>
                    <svg viewBox="0 0 400 140" className="mt-3 h-28 w-full">
                      <path d="M10 120 H390" stroke="#94a3b8" strokeWidth="1"/>
                      <path d="M40 130 V10" stroke="#94a3b8" strokeWidth="1"/>
                      {/* Payoff approximation */}
                      <path d="M40 85 L200 85 L360 30" stroke="#22c55e" strokeWidth="3" fill="none"/>
                    </svg>
                    <div className="mt-2 text-xs text-slate-400">Simple visual payoff — risk capped, income collected.</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-semibold">Everything in one secure place</h2>
          <p className="mt-3 max-w-2xl text-slate-300">Securely connect banks, cards, loans, insurance, HSA, and brokerage. Get real‑time insights and actionable coaching.</p>
          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[
              {title:"Unified accounts", desc:"All balances & transactions linked via trusted aggregators."},
              {title:"Smart budgets", desc:"Auto-categorization and cashflow alerts that actually help."},
              {title:"Options coach", desc:"Covered calls, cash‑secured puts — explained with visuals."},
              {title:"Insurance & HSA vault", desc:"Policies, renewals, claims, and eligible expenses in one view."},
              {title:"Portfolio & P&L", desc:"Holdings, dividends, taxes, and rebalancing nudges."},
              {title:"Bank‑grade security", desc:"MFA, field‑level encryption, and full audit trails."},
            ].map((f, i) => (
              <div key={i} className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <h3 className="text-lg font-semibold">{f.title}</h3>
                <p className="mt-2 text-slate-300">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Security */}
      <section id="security" className="py-20 border-y border-white/10 bg-white/5">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-semibold">Security first, by design</h2>
              <ul className="mt-6 space-y-3 text-slate-300 list-disc list-inside">
                <li>MFA & passkeys with device biometrics</li>
                <li>PII/token encryption using envelope keys</li>
                <li>Zero‑trust service mesh & least‑privilege access</li>
                <li>Compliance roadmap: SOC2, PCI scope minimization</li>
              </ul>
            </div>
            <div className="rounded-3xl border border-white/10 bg-black/20 p-6">
              <div className="text-sm text-slate-300">Live status</div>
              <div className="mt-3 grid grid-cols-2 gap-4">
                {[
                  {k:"API latency", v:"82 ms"},
                  {k:"Uptime (30d)", v:"99.98%"},
                  {k:"Incidents", v:"0"},
                  {k:"Regions", v:"US‑E, US‑W"},
                ].map((it, i) => (
                  <div key={i} className="rounded-xl bg-white/5 p-4">
                    <div className="text-slate-400 text-xs">{it.k}</div>
                    <div className="text-slate-100 text-lg font-medium">{it.v}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-semibold">Fair pricing</h2>
          <p className="mt-3 text-slate-300">Start free. Upgrade when you love it.</p>
          <div className="mx-auto mt-10 grid max-w-4xl grid-cols-1 gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-left">
              <h3 className="text-xl font-semibold">Starter</h3>
              <p className="mt-1 text-slate-300">Link accounts, budgets, portfolio view</p>
              <p className="mt-4 text-4xl font-bold">$0</p>
              <a href="#waitlist" className="mt-6 inline-flex rounded-xl bg-white/10 px-4 py-2 hover:bg-white/20">Join waitlist</a>
            </div>
            <div className="rounded-2xl border border-emerald-400/40 bg-gradient-to-br from-emerald-500/10 to-sky-500/10 p-6 text-left">
              <h3 className="text-xl font-semibold">Pro</h3>
              <p className="mt-1 text-slate-300">Options coach, smart alerts, insurance/HSA, exports</p>
              <p className="mt-4 text-4xl font-bold">$7<span className="text-2xl">/mo</span></p>
              <a href="#waitlist" className="mt-6 inline-flex rounded-xl bg-gradient-to-tr from-sky-500 via-indigo-500 to-emerald-500 px-4 py-2">Get early access</a>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-semibold">FAQ</h2>
          <div className="mt-8 divide-y divide-white/10">
            {[
              {q:"When is the beta?", a:"We’re inviting early users in waves. Join the waitlist to secure a spot."},
              {q:"Which countries do you support?", a:"Starting with the U.S. We’ll expand based on demand and partner APIs."},
              {q:"Do you store my bank credentials?", a:"No. Aggregation uses tokenized connections with leading providers."},
            ].map((item, i) => (
              <details key={i} className="group">
                <summary className="cursor-pointer py-4 text-lg font-medium list-none group-open:text-white text-slate-200">{item.q}</summary>
                <p className="pb-6 text-slate-300">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-sky-500 via-indigo-500 to-emerald-500 grid place-items-center">
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M7 4c7 0 10 16 3 16"/>
                  <path d="M17 4c-7 0-10 16-3 16"/>
                </svg>
              </div>
              <span className="font-semibold">FinHelix</span>
            </div>
            <div className="text-sm text-slate-400">© {new Date().getFullYear()} FinHelix. All rights reserved.</div>
          </div>
        </div>
      </footer>
    </div>
  );
}
