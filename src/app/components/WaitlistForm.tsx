'use client';

import { useState } from 'react';

export default function WaitlistForm() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle'|'ok'|'err'|'loading'>('idle');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus('loading');
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error(await res.text());
      setStatus('ok');
      setEmail('');
    } catch (e) {
      console.error(e);
      setStatus('err');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 flex w-full max-w-lg rounded-2xl border border-white/10 bg-white/5 p-2 backdrop-blur">
      <input
        name="email"
        type="email"
        required
        value={email}
        onChange={(e)=>setEmail(e.target.value)}
        placeholder="you@finhelix.app"
        className="w-full rounded-xl bg-transparent px-4 py-3 placeholder:text-slate-400 focus:outline-none"
      />
      <button
        disabled={status==='loading'}
        className="shrink-0 rounded-xl bg-gradient-to-tr from-sky-500 via-indigo-500 to-emerald-500 px-5 py-3 font-medium shadow-lg hover:opacity-90 disabled:opacity-60"
      >
        {status==='loading' ? '...' : 'Join'}
      </button>
      <div className="sr-only" aria-live="polite">
        {status==='ok' && 'Thanks! You are on the list.'}
        {status==='err' && 'Something went wrong.'}
      </div>
    </form>
  );
}
