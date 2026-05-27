import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const COUNTRIES = ['CZ', 'SK', 'AT', 'PL', 'DE', 'HU']
const DISCIPLINES = [
  { value: 'obstacle', label: 'Obstacle / OCR' },
  { value: 'bike_road', label: 'Bike — Road' },
  { value: 'bike_mtb', label: 'Bike — MTB' },
  { value: 'bike_gravel', label: 'Bike — Gravel' },
]

interface FormState {
  title: string
  date_start: string
  date_end: string
  location_name: string
  country: string
  discipline: string
  registration_url: string
  is_kids_friendly: boolean
  submitted_by: string
}

const EMPTY: FormState = {
  title: '',
  date_start: '',
  date_end: '',
  location_name: '',
  country: 'CZ',
  discipline: 'obstacle',
  registration_url: '',
  is_kids_friendly: false,
  submitted_by: '',
}

export default function SubmitRace() {
  const [form, setForm] = useState<FormState>(EMPTY)
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [error, setError] = useState('')

  function set(field: keyof FormState, value: string | boolean) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('submitting')
    setError('')

    const payload = {
      title: form.title.trim(),
      date_start: form.date_start,
      date_end: form.date_end || null,
      location_name: form.location_name.trim(),
      country: form.country,
      discipline: form.discipline,
      registration_url: form.registration_url.trim() || null,
      is_kids_friendly: form.is_kids_friendly,
      submitted_by: form.submitted_by.trim() || null,
      approval_status: 'pending_review' as const,
      is_official: false,
    }

    const { error: err } = await supabase.from('races').insert(payload)
    if (err) {
      setError(err.message)
      setStatus('error')
    } else {
      setStatus('success')
      setForm(EMPTY)
    }
  }

  return (
    <div className="min-h-screen bg-surface-900 text-white">
      <nav className="border-b border-white/[0.06] px-6 py-4 flex items-center gap-4">
        <Link to="/" className="text-gold font-bold text-lg tracking-tight" style={{ fontFamily: "'Inter Tight', sans-serif" }}>
          racedays
        </Link>
        <span className="text-white/20">/</span>
        <span className="text-white/50 text-sm">Add a race</span>
      </nav>

      <div className="max-w-xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold mb-1">Add a race</h1>
        <p className="text-white/40 text-sm mb-8">
          Manually submit a race event for admin review. It will appear on the map once approved.
        </p>

        {status === 'success' ? (
          <div className="bg-gold/10 border border-gold/30 rounded-xl p-6 text-center">
            <p className="text-gold font-semibold mb-1">Race submitted!</p>
            <p className="text-white/50 text-sm mb-4">It will appear after admin approval.</p>
            <button
              onClick={() => setStatus('idle')}
              className="text-sm text-white/50 hover:text-white/80 transition-colors underline"
            >
              Submit another
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <Field label="Race name *">
              <input
                required
                value={form.title}
                onChange={e => set('title', e.target.value)}
                placeholder="e.g. Spartan Sprint Praha 2025"
                className={inputCls}
              />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Start date *">
                <input
                  required
                  type="date"
                  value={form.date_start}
                  onChange={e => set('date_start', e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="End date">
                <input
                  type="date"
                  value={form.date_end}
                  onChange={e => set('date_end', e.target.value)}
                  className={inputCls}
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Location *">
                <input
                  required
                  value={form.location_name}
                  onChange={e => set('location_name', e.target.value)}
                  placeholder="e.g. Praha"
                  className={inputCls}
                />
              </Field>
              <Field label="Country *">
                <select
                  value={form.country}
                  onChange={e => set('country', e.target.value)}
                  className={inputCls}
                >
                  {COUNTRIES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </Field>
            </div>

            <Field label="Discipline *">
              <select
                value={form.discipline}
                onChange={e => set('discipline', e.target.value)}
                className={inputCls}
              >
                {DISCIPLINES.map(d => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
            </Field>

            <Field label="Registration link">
              <input
                type="url"
                value={form.registration_url}
                onChange={e => set('registration_url', e.target.value)}
                placeholder="https://..."
                className={inputCls}
              />
            </Field>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_kids_friendly}
                onChange={e => set('is_kids_friendly', e.target.checked)}
                className="w-4 h-4 accent-gold"
              />
              <span className="text-sm text-white/70">Kids / junior categories available ⭐</span>
            </label>

            <Field label="Your email (optional)">
              <input
                type="email"
                value={form.submitted_by}
                onChange={e => set('submitted_by', e.target.value)}
                placeholder="you@example.com"
                className={inputCls}
              />
            </Field>

            {error && (
              <p className="text-red-400 text-sm bg-red-900/20 border border-red-800/30 rounded-lg px-4 py-3">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={status === 'submitting'}
              className="mt-2 w-full py-3 rounded-xl font-semibold text-sm bg-gold text-surface-900 hover:bg-gold/90 transition-colors disabled:opacity-50"
            >
              {status === 'submitting' ? 'Submitting…' : 'Submit race for review'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

const inputCls = 'w-full bg-surface-800 border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-gold/50 transition-colors'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-white/40 uppercase tracking-wide">{label}</label>
      {children}
    </div>
  )
}
