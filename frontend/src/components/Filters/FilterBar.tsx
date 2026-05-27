import { Filters } from '../../types/race'

const DISCIPLINES = [
  { value: 'obstacle', label: 'Obstacle' },
  { value: 'bike_road', label: 'Road' },
  { value: 'bike_mtb', label: 'MTB' },
  { value: 'bike_gravel', label: 'Gravel' },
]

const COUNTRIES = ['CZ', 'SK', 'AT', 'PL', 'DE', 'HU']

interface Props {
  filters: Filters
  onChange: (f: Filters) => void
}

export default function FilterBar({ filters, onChange }: Props) {
  function toggleDiscipline(val: string) {
    const next = filters.disciplines.includes(val)
      ? filters.disciplines.filter(d => d !== val)
      : [...filters.disciplines, val]
    onChange({ ...filters, disciplines: next })
  }

  function toggleCountry(val: string) {
    const next = filters.countries.includes(val)
      ? filters.countries.filter(c => c !== val)
      : [...filters.countries, val]
    onChange({ ...filters, countries: next })
  }

  const hasActiveFilters =
    filters.disciplines.length > 0 ||
    filters.kidsOnly ||
    filters.countries.length > 0 ||
    filters.dateFrom ||
    filters.dateTo

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-2 flex flex-wrap items-center gap-x-4 gap-y-2">
      <div className="flex items-center gap-1.5">
        <span className="text-gray-400 text-xs font-medium uppercase tracking-wide">Type</span>
        {DISCIPLINES.map(d => (
          <button
            key={d.value}
            onClick={() => toggleDiscipline(d.value)}
            className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
              filters.disciplines.includes(d.value)
                ? 'bg-gray-800 text-white border-gray-800'
                : 'bg-white text-gray-600 border-gray-300 hover:border-gray-500'
            }`}
          >
            {d.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-1.5">
        <span className="text-gray-400 text-xs font-medium uppercase tracking-wide">Country</span>
        {COUNTRIES.map(c => (
          <button
            key={c}
            onClick={() => toggleCountry(c)}
            className={`px-2 py-1 rounded text-xs font-medium border transition-colors ${
              filters.countries.includes(c)
                ? 'bg-gray-800 text-white border-gray-800'
                : 'bg-white text-gray-600 border-gray-300 hover:border-gray-500'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <label className="flex items-center gap-1.5 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={filters.kidsOnly}
          onChange={e => onChange({ ...filters, kidsOnly: e.target.checked })}
          className="rounded border-gray-300"
        />
        <span className="text-xs text-gray-600 font-medium">Kids ⭐</span>
      </label>

      <div className="flex items-center gap-1.5">
        <span className="text-gray-400 text-xs font-medium uppercase tracking-wide">From</span>
        <input
          type="date"
          value={filters.dateFrom}
          onChange={e => onChange({ ...filters, dateFrom: e.target.value })}
          className="text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-gray-500"
        />
        <span className="text-gray-400 text-xs">–</span>
        <input
          type="date"
          value={filters.dateTo}
          onChange={e => onChange({ ...filters, dateTo: e.target.value })}
          className="text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-gray-500"
        />
      </div>

      {hasActiveFilters && (
        <button
          onClick={() =>
            onChange({ disciplines: [], kidsOnly: false, countries: [], dateFrom: '', dateTo: '' })
          }
          className="text-xs text-gray-400 hover:text-gray-600 underline"
        >
          clear all
        </button>
      )}
    </div>
  )
}
