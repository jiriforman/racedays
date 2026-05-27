import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { format, parseISO } from 'date-fns'
import type { Session } from '@supabase/supabase-js'

type Tab = 'races' | 'sources' | 'active_sources' | 'config'

interface PendingRace {
  id: string
  title: string
  date_start: string
  location_name: string
  country: string
  discipline: string
  is_kids_friendly: boolean
  registration_url: string | null
  submitted_by: string | null
  created_at: string
}

interface PendingSource {
  id: string
  name: string
  url: string
  discipline: string
  status: string
  submitted_by: string | null
  sample_races: unknown[] | null
  created_at: string
  last_scraped_at: string | null
  ai_model: string | null
}

interface ConfigRow {
  key: string
  value: string
  description: string | null
}

export default function Admin() {
  const [session, setSession] = useState<Session | null>(null)
  const [authLoading, setAuthLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setAuthLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => subscription.unsubscribe()
  }, [])

  if (authLoading) {
    return <LoadingScreen />
  }

  if (!session) {
    return <LoginForm onLogin={setSession} />
  }

  return <Dashboard session={session} />
}

// ─── Login form ────────────────────────────────────────────────────────────────

function LoginForm({ onLogin }: { onLogin: (s: Session) => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { data, error: err } = await supabase.auth.signInWithPassword({ email, password })
    if (err) {
      setError(err.message)
      setLoading(false)
    } else if (data.session) {
      onLogin(data.session)
    }
  }

  return (
    <div className="min-h-screen bg-surface-900 flex items-center justify-center">
      <div className="w-full max-w-sm px-6">
        <div className="text-center mb-8">
          <span className="text-gold font-bold text-2xl tracking-tight" style={{ fontFamily: "'Inter Tight', sans-serif" }}>
            racedays
          </span>
          <p className="text-white/30 text-sm mt-1">admin</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            required
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="Email"
            className={inputCls}
          />
          <input
            required
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Password"
            className={inputCls}
          />
          {error && <p className="text-red-400 text-sm text-center">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl font-semibold text-sm bg-gold text-surface-900 hover:bg-gold/90 transition-colors disabled:opacity-50"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ─── Main dashboard ────────────────────────────────────────────────────────────

function Dashboard({ session: _session }: { session: Session }) {
  const [tab, setTab] = useState<Tab>('races')
  const [pendingRaces, setPendingRaces] = useState<PendingRace[]>([])
  const [pendingSources, setPendingSources] = useState<PendingSource[]>([])
  const [activeSources, setActiveSources] = useState<PendingSource[]>([])
  const [config, setConfig] = useState<ConfigRow[]>([])
  const [loading, setLoading] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    const [r1, r2, r3, r4] = await Promise.all([
      supabase.from('races').select('id,title,date_start,location_name,country,discipline,is_kids_friendly,registration_url,submitted_by,created_at').eq('approval_status', 'pending_review').order('created_at', { ascending: false }),
      supabase.from('sources').select('*').eq('status', 'pending').order('created_at', { ascending: false }),
      supabase.from('sources').select('*').in('status', ['active', 'inactive', 'failed']).order('name'),
      supabase.from('config').select('*').order('key'),
    ])
    setPendingRaces((r1.data as PendingRace[]) ?? [])
    setPendingSources((r2.data as PendingSource[]) ?? [])
    setActiveSources((r3.data as PendingSource[]) ?? [])
    setConfig((r4.data as ConfigRow[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  async function approveRace(id: string) {
    await supabase.from('races').update({ approval_status: 'approved' }).eq('id', id)
    setPendingRaces(prev => prev.filter(r => r.id !== id))
  }

  async function rejectRace(id: string) {
    await supabase.from('races').update({ approval_status: 'rejected' }).eq('id', id)
    setPendingRaces(prev => prev.filter(r => r.id !== id))
  }

  async function activateSource(id: string) {
    await supabase.from('sources').update({ status: 'active' }).eq('id', id)
    loadData()
  }

  async function rejectSource(id: string) {
    await supabase.from('sources').update({ status: 'inactive' }).eq('id', id)
    setPendingSources(prev => prev.filter(s => s.id !== id))
  }

  async function updateConfig(key: string, value: string) {
    await supabase.from('config').update({ value }).eq('key', key)
    setConfig(prev => prev.map(c => c.key === key ? { ...c, value } : c))
  }

  const TABS: { id: Tab; label: string; badge?: number }[] = [
    { id: 'races', label: 'Pending races', badge: pendingRaces.length },
    { id: 'sources', label: 'Pending sources', badge: pendingSources.length },
    { id: 'active_sources', label: 'Sources' },
    { id: 'config', label: 'Config' },
  ]

  return (
    <div className="min-h-screen bg-surface-900 text-white">
      <nav className="border-b border-white/[0.06] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/" className="text-gold font-bold text-lg tracking-tight" style={{ fontFamily: "'Inter Tight', sans-serif" }}>
            racedays
          </Link>
          <span className="text-white/20">/</span>
          <span className="text-white/50 text-sm">Admin</span>
        </div>
        <button
          onClick={() => supabase.auth.signOut()}
          className="text-xs text-white/30 hover:text-white/60 transition-colors"
        >
          Sign out
        </button>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Tab bar */}
        <div className="flex gap-1 mb-8 border-b border-white/[0.06]">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2.5 text-sm font-medium transition-colors relative ${
                tab === t.id
                  ? 'text-white after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-gold'
                  : 'text-white/40 hover:text-white/70'
              }`}
            >
              {t.label}
              {typeof t.badge === 'number' && t.badge > 0 && (
                <span className="ml-2 text-xs bg-gold/20 text-gold px-1.5 py-0.5 rounded-full">{t.badge}</span>
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-white/30 text-sm">Loading…</p>
        ) : (
          <>
            {tab === 'races' && (
              <PendingRacesTab races={pendingRaces} onApprove={approveRace} onReject={rejectRace} />
            )}
            {tab === 'sources' && (
              <PendingSourcesTab sources={pendingSources} onActivate={activateSource} onReject={rejectSource} />
            )}
            {tab === 'active_sources' && (
              <ActiveSourcesTab sources={activeSources} />
            )}
            {tab === 'config' && (
              <ConfigTab rows={config} onUpdate={updateConfig} />
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ─── Pending Races tab ─────────────────────────────────────────────────────────

function PendingRacesTab({ races, onApprove, onReject }: {
  races: PendingRace[]
  onApprove: (id: string) => void
  onReject: (id: string) => void
}) {
  if (races.length === 0) {
    return <Empty text="No pending races" />
  }

  return (
    <div className="flex flex-col gap-3">
      {races.map(race => (
        <div key={race.id} className="bg-surface-800 rounded-xl p-5 border border-white/[0.06]">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-white">{race.title}</h3>
              <p className="text-xs text-white/40 mt-1 font-mono">
                {fmtDate(race.date_start)} · {race.country} {race.location_name} · {race.discipline}
                {race.is_kids_friendly && ' · ⭐'}
              </p>
              {race.registration_url && (
                <a href={race.registration_url} target="_blank" rel="noreferrer"
                  className="text-xs text-gold/70 hover:text-gold mt-1 block truncate">
                  {race.registration_url}
                </a>
              )}
              {race.submitted_by && (
                <p className="text-xs text-white/25 mt-1">by {race.submitted_by}</p>
              )}
            </div>
            <div className="flex gap-2 shrink-0">
              <ActionButton onClick={() => onApprove(race.id)} variant="approve">Approve</ActionButton>
              <ActionButton onClick={() => onReject(race.id)} variant="reject">Reject</ActionButton>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Pending Sources tab ───────────────────────────────────────────────────────

function PendingSourcesTab({ sources, onActivate, onReject }: {
  sources: PendingSource[]
  onActivate: (id: string) => void
  onReject: (id: string) => void
}) {
  if (sources.length === 0) {
    return <Empty text="No pending sources" />
  }

  return (
    <div className="flex flex-col gap-4">
      {sources.map(src => {
        const samples = Array.isArray(src.sample_races) ? src.sample_races as Array<Record<string, unknown>> : []
        return (
          <div key={src.id} className="bg-surface-800 rounded-xl p-5 border border-white/[0.06]">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-white">{src.name || '(unnamed)'}</h3>
                <a href={src.url} target="_blank" rel="noreferrer"
                  className="text-xs text-gold/70 hover:text-gold block truncate mt-0.5">
                  {src.url}
                </a>
                <p className="text-xs text-white/40 mt-1 font-mono">
                  {src.discipline} · submitted {fmtDate(src.created_at)}
                  {src.submitted_by && ` by ${src.submitted_by}`}
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <ActionButton onClick={() => onActivate(src.id)} variant="approve">Activate</ActionButton>
                <ActionButton onClick={() => onReject(src.id)} variant="reject">Reject</ActionButton>
              </div>
            </div>

            {samples.length > 0 && (
              <div>
                <p className="text-xs text-white/30 uppercase tracking-wide mb-2">Sample races ({samples.length})</p>
                <div className="flex flex-col gap-1.5">
                  {samples.map((r, i) => (
                    <div key={i} className="text-xs text-white/60 bg-surface-700 rounded-lg px-3 py-2 font-mono">
                      <span className="text-white/80">{String(r.title ?? '')}</span>
                      {r.date_start != null && <span className="text-white/30 ml-2">{String(r.date_start)}</span>}
                      {r.location_name != null && <span className="text-white/30 ml-2">{String(r.location_name)}</span>}
                      {r.discipline != null && <span className="text-gold/50 ml-2">{String(r.discipline)}</span>}
                      {Boolean(r.is_kids_friendly) && <span className="ml-1">⭐</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Active Sources tab ────────────────────────────────────────────────────────

function ActiveSourcesTab({ sources }: { sources: PendingSource[] }) {
  if (sources.length === 0) {
    return <Empty text="No sources" />
  }

  return (
    <div className="flex flex-col gap-2">
      {sources.map(src => (
        <div key={src.id} className="bg-surface-800 rounded-xl px-5 py-4 border border-white/[0.06] flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm text-white">{src.name}</p>
            <a href={src.url} target="_blank" rel="noreferrer"
              className="text-xs text-white/30 hover:text-white/60 block truncate">{src.url}</a>
          </div>
          <div className="flex items-center gap-3 shrink-0 text-xs font-mono text-white/30">
            <span className={`px-2 py-0.5 rounded-full text-xs ${src.status === 'active' ? 'bg-green-900/30 text-green-400' : 'bg-white/5 text-white/30'}`}>
              {src.status}
            </span>
            <span>{src.discipline}</span>
            {src.last_scraped_at && <span>scraped {fmtDate(src.last_scraped_at)}</span>}
            {src.ai_model && <span className="text-white/20">{src.ai_model}</span>}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Config tab ────────────────────────────────────────────────────────────────

function ConfigTab({ rows, onUpdate }: { rows: ConfigRow[]; onUpdate: (key: string, value: string) => void }) {
  const [editing, setEditing] = useState<Record<string, string>>({})

  function startEdit(key: string, current: string) {
    setEditing(prev => ({ ...prev, [key]: current }))
  }

  function cancelEdit(key: string) {
    setEditing(prev => { const n = { ...prev }; delete n[key]; return n })
  }

  async function saveEdit(key: string) {
    await onUpdate(key, editing[key])
    cancelEdit(key)
  }

  return (
    <div className="flex flex-col gap-3">
      {rows.map(row => (
        <div key={row.key} className="bg-surface-800 rounded-xl px-5 py-4 border border-white/[0.06]">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-mono text-gold">{row.key}</p>
              {row.description && <p className="text-xs text-white/30 mt-0.5">{row.description}</p>}
            </div>
            {editing[row.key] !== undefined ? (
              <div className="flex items-center gap-2">
                <input
                  value={editing[row.key]}
                  onChange={e => setEditing(prev => ({ ...prev, [row.key]: e.target.value }))}
                  className="bg-surface-700 border border-gold/30 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-gold/60 font-mono w-64"
                />
                <button onClick={() => saveEdit(row.key)} className="text-xs text-green-400 hover:text-green-300 px-2">Save</button>
                <button onClick={() => cancelEdit(row.key)} className="text-xs text-white/30 hover:text-white/60 px-2">Cancel</button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <span className="text-sm font-mono text-white/70 bg-surface-700 px-3 py-1.5 rounded-lg">{row.value}</span>
                <button
                  onClick={() => startEdit(row.key, row.value)}
                  className="text-xs text-white/30 hover:text-white/60 transition-colors"
                >
                  Edit
                </button>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Shared utilities ──────────────────────────────────────────────────────────

function ActionButton({ onClick, variant, children }: { onClick: () => void; variant: 'approve' | 'reject'; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
        variant === 'approve'
          ? 'bg-green-900/30 text-green-400 hover:bg-green-900/50'
          : 'bg-red-900/20 text-red-400 hover:bg-red-900/40'
      }`}
    >
      {children}
    </button>
  )
}

function Empty({ text }: { text: string }) {
  return (
    <div className="flex items-center justify-center h-40">
      <p className="text-white/25 text-sm">{text}</p>
    </div>
  )
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-surface-900 flex items-center justify-center">
      <p className="text-white/30 text-sm">Loading…</p>
    </div>
  )
}

function fmtDate(d: string) {
  try { return format(parseISO(d), 'd MMM yyyy') } catch { return d }
}

const inputCls = 'w-full bg-surface-800 border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-gold/50 transition-colors'
