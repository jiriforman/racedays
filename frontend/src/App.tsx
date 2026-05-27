import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import { Race, Filters } from './types/race'
import RaceMap from './components/Map/RaceMap'
import RaceList from './components/RaceList/RaceList'
import FilterBar from './components/Filters/FilterBar'
import RaceDetail from './components/RaceDetail/RaceDetail'

const DEFAULT_FILTERS: Filters = {
  disciplines: [],
  kidsOnly: false,
  countries: [],
  dateFrom: '',
  dateTo: '',
  age: '',
}

export default function App() {
  const [races, setRaces] = useState<Race[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS)
  const [selectedRace, setSelectedRace] = useState<Race | null>(null)
  // Mobile: bottom sheet list toggle
  const [mobileListOpen, setMobileListOpen] = useState(false)

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
        let next = data ?? []
        // Age filter (client-side: handles open-ended min/max ranges)
        const age = filters.age ? parseInt(filters.age, 10) : null
        if (age != null && !Number.isNaN(age)) {
          next = next.filter(
            r =>
              (r.min_age == null || r.min_age <= age) &&
              (r.max_age == null || r.max_age >= age)
          )
        }
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
    <div className="w-screen h-screen flex flex-col overflow-hidden bg-surface-900">
      {/* ── Fixed top menu: wordmark + filter bar ── */}
      <header className="shrink-0 z-[600] bg-surface-900 border-b border-white/10 shadow-lg">
        <div className="flex items-center gap-3 px-4 pt-3">
          <span
            className="text-white font-bold text-xl tracking-tight select-none"
            style={{ fontFamily: "'Inter Tight', sans-serif" }}
          >
            racedays
          </span>
          <span className="text-white/30 text-xs hidden sm:inline">
            races in CZ/SK &amp; Central Europe
          </span>
        </div>
        <FilterBar filters={filters} onChange={setFilters} />
      </header>

      {/* ── Content: sidebar list + map ── */}
      <div className="flex-1 flex overflow-hidden">
        {/* Desktop sidebar list (~30%) */}
        <aside className="hidden md:flex md:flex-col w-[340px] lg:w-[380px] shrink-0 overflow-y-auto bg-surface-800 border-r border-white/10">
          <RaceList
            races={races}
            loading={loading}
            selectedRaceId={selectedRace?.id ?? null}
            onSelectRace={(id) => (id === null ? handleCloseDetail() : handleSelectRace(id))}
          />
        </aside>

        {/* Map (~70%) */}
        <main className="relative flex-1 min-w-0">
          <RaceMap
            races={races}
            selectedRaceId={selectedRace?.id ?? null}
            onSelectRace={handleSelectRace}
          />

          {/* Desktop: race detail — floating card over the map */}
          {selectedRace && (
            <div className="hidden md:block absolute left-4 top-4 z-[500] w-[360px] max-h-[calc(100%-2rem)] overflow-y-auto rounded-xl shadow-2xl bg-surface-700 border border-white/10">
              <RaceDetail race={selectedRace} onClose={handleCloseDetail} />
            </div>
          )}

          {/* Mobile: "N races" pill — bottom-left */}
          {!selectedRace && (
            <button
              onClick={() => setMobileListOpen(true)}
              className="md:hidden absolute bottom-6 left-4 z-[500] flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-surface-700 border border-white/10 text-white/80 shadow-lg"
            >
              {races.length} race{races.length !== 1 ? 's' : ''} ▲
            </button>
          )}
        </main>
      </div>

      {/* ══════════════ MOBILE overlays ══════════════ */}

      {/* Mobile: bottom sheet — race list */}
      {mobileListOpen && !selectedRace && (
        <div
          className="md:hidden fixed bottom-0 left-0 right-0 z-[550] bg-surface-700 rounded-t-2xl shadow-2xl"
          style={{ height: '60%' }}
        >
          <div className="flex justify-center pt-2 pb-1 shrink-0" onClick={() => setMobileListOpen(false)}>
            <div className="w-10 h-1 rounded-full bg-white/20" />
          </div>
          <div className="overflow-y-auto h-[calc(100%-24px)]">
            <RaceList
              races={races}
              loading={loading}
              selectedRaceId={null}
              onSelectRace={(id) => (id === null ? handleCloseDetail() : handleSelectRace(id))}
            />
          </div>
        </div>
      )}

      {/* Mobile: race detail slides up */}
      {selectedRace && (
        <div
          className="md:hidden fixed bottom-0 left-0 right-0 z-[560] bg-surface-700 rounded-t-2xl shadow-2xl overflow-y-auto"
          style={{ maxHeight: '75%' }}
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
