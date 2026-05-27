import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import { Race, Filters } from './types/race'
import RaceMap from './components/Map/RaceMap'
import RaceList from './components/RaceList/RaceList'
import FilterBar from './components/Filters/FilterBar'

const DEFAULT_FILTERS: Filters = {
  disciplines: [],
  kidsOnly: false,
  countries: [],
  dateFrom: '',
  dateTo: '',
}

export default function App() {
  const [races, setRaces] = useState<Race[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS)
  const [selectedRaceId, setSelectedRaceId] = useState<string | null>(null)

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
        setRaces(data ?? [])
        setLoading(false)
      }
    }

    fetchRaces()
    return () => { cancelled = true }
  }, [filters])

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 shrink-0 z-10">
        <span className="text-xl">🏃</span>
        <h1 className="text-lg font-bold text-gray-900 tracking-tight">racedays</h1>
        <span className="text-sm text-gray-400 hidden sm:block">
          discover races in CZ/SK &amp; Central Europe
        </span>
      </header>

      <FilterBar filters={filters} onChange={setFilters} />

      <div className="flex flex-1 overflow-hidden flex-col md:flex-row">
        <div className="h-[50vh] md:h-auto md:flex-1 shrink-0">
          <RaceMap
            races={races}
            selectedRaceId={selectedRaceId}
            onSelectRace={setSelectedRaceId}
          />
        </div>
        <div className="w-full md:w-96 overflow-y-auto border-t md:border-t-0 md:border-l border-gray-200 bg-white shrink-0">
          <RaceList
            races={races}
            loading={loading}
            selectedRaceId={selectedRaceId}
            onSelectRace={setSelectedRaceId}
          />
        </div>
      </div>
    </div>
  )
}
