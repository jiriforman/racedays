import { useState } from 'react'
import { Link } from 'react-router-dom'

const N8N_WEBHOOK = import.meta.env.VITE_N8N_ONBOARDING_WEBHOOK || 'https://n8n.acoe.cloud/webhook/source-onboard'

export default function SuggestSource() {
  const [url, setUrl] = useState('')
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'invalid' | 'error'>('idle')
  const [result, setResult] = useState<{ source_name?: string; discipline?: string; country?: string; message?: string; reason?: string } | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('submitting')
    setResult(null)

    try {
      const res = await fetch(N8N_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim(), submitted_by: email.trim() || undefined }),
      })

      const json = await res.json().catch(() => ({}))
      setResult(json)

      if (res.status === 201) {
        setStatus('success')
        setUrl('')
        setEmail('')
      } else if (res.status === 422) {
        setStatus('invalid')
      } else {
        setStatus('error')
      }
    } catch {
      setStatus('error')
      setResult({ message: 'Network error. Please try again.' })
    }
  }

  return (
    <div className="min-h-screen bg-surface-900 text-white">
      <nav className="border-b border-white/[0.06] px-6 py-4 flex items-center gap-4">
        <Link to="/" className="text-gold font-bold text-lg tracking-tight" style={{ fontFamily: "'Inter Tight', sans-serif" }}>
          racedays
        </Link>
        <span className="text-white/20">/</span>
        <span className="text-white/50 text-sm">Suggest a source</span>
      </nav>

      <div className="max-w-lg mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold mb-1">Suggest a source</h1>
        <p className="text-white/40 text-sm mb-8">
          Know a race listing site that's missing? Submit its URL — our AI will check if it's a valid race source and extract sample races for admin review.
        </p>

        {status === 'success' && result ? (
          <div className="bg-gold/10 border border-gold/30 rounded-xl p-6">
            <p className="text-gold font-semibold mb-1">Source submitted for review!</p>
            {result.source_name && (
              <p className="text-white/70 text-sm mt-2">
                Identified as <strong className="text-white">{result.source_name}</strong>
                {result.discipline && <> · {result.discipline}</>}
                {result.country && <> · {result.country}</>}
              </p>
            )}
            <p className="text-white/40 text-xs mt-3">An admin will review and activate it.</p>
            <button
              onClick={() => setStatus('idle')}
              className="mt-4 text-sm text-white/50 hover:text-white/80 transition-colors underline"
            >
              Suggest another
            </button>
          </div>
        ) : status === 'invalid' && result ? (
          <div className="bg-red-900/20 border border-red-800/30 rounded-xl p-6">
            <p className="text-red-400 font-semibold mb-1">Not recognized as a race listing</p>
            {result.reason && <p className="text-white/50 text-sm mt-1">{result.reason}</p>}
            <button
              onClick={() => setStatus('idle')}
              className="mt-4 text-sm text-white/50 hover:text-white/80 transition-colors underline"
            >
              Try a different URL
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-white/40 uppercase tracking-wide">Race listing URL *</label>
              <input
                required
                type="url"
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder="https://somerace.cz/zavody/"
                className="w-full bg-surface-800 border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-gold/50 transition-colors"
              />
              <p className="text-xs text-white/30">Link directly to the page that lists all upcoming events.</p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-white/40 uppercase tracking-wide">Your email (optional)</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-surface-800 border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-gold/50 transition-colors"
              />
            </div>

            {status === 'error' && (
              <p className="text-red-400 text-sm bg-red-900/20 border border-red-800/30 rounded-lg px-4 py-3">
                {result?.message || 'Something went wrong. Please try again.'}
              </p>
            )}

            <button
              type="submit"
              disabled={status === 'submitting'}
              className="mt-2 w-full py-3 rounded-xl font-semibold text-sm bg-gold text-surface-900 hover:bg-gold/90 transition-colors disabled:opacity-50"
            >
              {status === 'submitting' ? 'Analyzing…' : 'Submit for review'}
            </button>

            <p className="text-xs text-white/20 text-center">
              Our AI will analyze the URL and extract sample races. This takes 10–20 seconds.
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
