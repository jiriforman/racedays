import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Race, Filters } from '../types/race'
import RaceMap from '../components/Map/RaceMap'
import RaceList from '../components/RaceList/RaceList'
import FilterBar from '../components/Filters/FilterBar'
import RaceDetail from '../components/RaceDetail/RaceDetail'
import { Link } from 'react-router-dom'

const DEFAULT_FILTERS: Filters = {
  disciplines: [],
  kidsOnly: false,
  countries: [],
  dateFrom: '',
  dateTo: '',
}

export default function MapView() {
  const [races, setRaces] = useState<Race[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS)
  const [selectedRace, setSelectedRace] = useState<Race | null>(null)
  const [listOpen, setListOpen] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function fetchRaces() {
      setLoading(true)
      let query = supabase
        .from('races')
        .select('*')
        .order('date_start', { ascending: true })

      if (filters.disciplines.length > 0) {
        query = query.in('discipline', filters.disciplines)
      }
      if (filters.kidsOnly) {
        query = query.eq('is_kids_friendly', true)
      }
      if (filters.countries.length > 0) {
        query = query.in('country', filters.countries)
      }
      if (filters.dateFrom) {
        query = query.gte('date_start', filters.dateFrom)
      }
      if (filters.dateTo) {
        query = query.lte('date_start', filters.dateTo)
      }

      const { data } = await query
      if (!cancelled) {
        const next = data ?? []
        setRaces(next)
        setSelectedRace(prev => (prev && next.some(r => r.id === prev.id) ? prev : null))
        setLoading(false)
      }
    }

    fetchRaces()
    return () => { cancelled = true }
  }, [filters])

  function handleSelectRace(id: string) {
    const race = races.find(r => r.id === id) ?? null
    setSelectedRace(prev => prev?.id === id ? null : race)
  }

  function handleCloseDetail() {
    setSelectedRace(null)
  }

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-surface-900">
      {/* ── Full-screen map (z-0) ── */}
      <div className="absolute inset-0 z-0">
        <RaceMap
          races={races}
          selectedRaceId={selectedRace?.id ?? null}
          onSelectRace={handleSelectRace}
        />
      </div>

      {/* ── Top overlay: wordmark + filter bar ── */}
      <div className="absolute top-0 left-0 right-0 z-[400] flex flex-col pointer-events-none">
        <header className="pointer-events-auto flex items-center gap-3 px-4 pt-3 pb-2">
          <span className="text-white font-bold text-xl tracking-tight select-none"
            style={{ fontFamily: "'Inter Tight', sans-serif", textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>
            racedays
          </span>
          <div className="flex gap-2 ml-2">
            <Link to="/submit"
              className="text-xs text-white/40 hover:text-white/70 transition-colors px-2 py-1 rounded"
              style={{ textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>
              add race
            </Link>
            <Link to="/suggest-source"
              className="text-xs text-white/40 hover:text-white/70 transition-colors px-2 py-1 rounded"
              style={{ textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>
              suggest source
            </Link>
          </div>
        </header>

        <div className="pointer-events-auto">
          <FilterBar filters={filters} onChange={setFilters} />
        </div>
      </div>

      {/* ══════════════ DESKTOP layout (md+) ══════════════ */}

      {selectedRace && (
        <div className="hidden md:block fixed left-4 top-24 z-[500] w-[380px] max-h-[calc(100vh-6rem)] overflow-y-auto rounded-xl shadow-2xl bg-surface-700">
          <RaceDetail race={selectedRace} onClose={handleCloseDetail} />
        </div>
      )}

      <div className="hidden md:flex fixed bottom-6 left-4 z-[500] flex-col items-start gap-2">
        <button
          onClick={() => setListOpen(v => !v)}
          className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-surface-700 border border-white/10 text-white/70 hover:text-white hover:border-white/20 transition-colors shadow-lg"
        >
          <span>{races.length} race{races.length !== 1 ? 's' : ''}</span>
          <span className="text-white/30">{listOpen ? '▼' : '▲'}</span>
        </button>
      </div>

      {listOpen && (
        <div className="hidden md:block fixed bottom-20 left-4 z-[500] w-[380px] max-h-[60vh] overflow-y-auto rounded-xl shadow-2xl bg-surface-700 border border-white/[0.06]">
          <RaceList
            races={races}
            loading={loading}
            selectedRaceId={selectedRace?.id ?? null}
            onSelectRace={(id) => {
              if (id === null) handleCloseDetail()
              else handleSelectRace(id)
            }}
          />
        </div>
      )}

      {/* ══════════════ MOBILE layout (< md) ══════════════ */}

      {!selectedRace && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-[400] bg-surface-700 rounded-t-2xl shadow-2xl"
          style={{ height: '50%' }}>
          <div className="flex justify-center pt-2 pb-1 shrink-0">
            <div className="w-10 h-1 rounded-full bg-white/20" />
          </div>
          <div className="overflow-y-auto h-[calc(100%-24px)]">
            <RaceList
              races={races}
              loading={loading}
              selectedRaceId={null}
              onSelectRace={(id) => {
                if (id === null) handleCloseDetail()
                else handleSelectRace(id)
              }}
            />
          </div>
        </div>
      )}

      {selectedRace && (
        <div
          className="md:hidden fixed bottom-0 left-0 right-0 z-[450] bg-surface-700 rounded-t-2xl shadow-2xl overflow-y-auto"
          style={{ maxHeight: '70vh' }}
        >
          <div className="flex justify-center pt-2 pb-1 shrink-0">
            <div className="w-10 h-1 rounded-full bg-white/20" />
          </div>
          <RaceDetail race={selectedRace} onClose={handleCloseDetail} />
        </div>
      )}
    </div>
  )
}
