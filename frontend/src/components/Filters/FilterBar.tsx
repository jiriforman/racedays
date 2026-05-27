import { Filters } from '../../types/race'

const DISCIPLINES = [
  { value: 'obstacle', label: 'Obstacle', emoji: '🏃' },
  { value: 'bike_road', label: 'Road', emoji: '🚴' },
  { value: 'bike_mtb', label: 'MTB', emoji: '🚵' },
  { value: 'bike_gravel', label: 'Gravel', emoji: '⛰️' },
]

const COUNTRIES = [
  { value: 'CZ', flag: '🇨🇿' },
  { value: 'SK', flag: '🇸🇰' },
  { value: 'AT', flag: '🇦🇹' },
  { value: 'PL', flag: '🇵🇱' },
  { value: 'DE', flag: '🇩🇪' },
  { value: 'HU', flag: '🇭🇺' },
]

interface Props {
  filters: Filters
  onChange: (f: Filters) => void
}

const pill = (active: boolean) =>
  `flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors border shrink-0 ${
    active
      ? 'border-gold text-gold bg-gold/10'
      : 'border-white/20 text-white/50 hover:text-white/80 hover:border-white/40'
  }`

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
    filters.dateTo ||
    filters.age

  const label = 'text-[10px] uppercase tracking-widest text-white/30 font-semibold mr-1 shrink-0'
  const divider = <span className="w-px h-5 bg-white/10 shrink-0" />

  return (
    <div className="flex items-center gap-2 overflow-x-auto scrollbar-none px-4 py-2.5">
      {/* Race type */}
      <span className={label}>Type</span>
      {DISCIPLINES.map(d => {
        const active = filters.disciplines.includes(d.value)
        return (
          <button key={d.value} onClick={() => toggleDiscipline(d.value)} className={pill(active)}>
            <span>{d.emoji}</span>
            <span>{d.label}</span>
          </button>
        )
      })}

      {divider}

      {/* Kids */}
      <button
        onClick={() => onChange({ ...filters, kidsOnly: !filters.kidsOnly })}
        className={pill(filters.kidsOnly)}
      >
        Kids ⭐
      </button>

      {divider}

      {/* Country */}
      <span className={label}>Country</span>
      {COUNTRIES.map(c => {
        const active = filters.countries.includes(c.value)
        return (
          <button key={c.value} onClick={() => toggleCountry(c.value)} className={pill(active)}>
            <span>{c.flag}</span>
            <span>{c.value}</span>
          </button>
        )
      })}

      {divider}

      {/* Age */}
      <span className={label}>Age</span>
      <input
        type="number"
        min={0}
        max={99}
        value={filters.age}
        onChange={e => onChange({ ...filters, age: e.target.value })}
        placeholder="any"
        className="w-16 px-2 py-1.5 rounded-full text-xs bg-transparent border border-white/20 text-white/80 placeholder:text-white/30 focus:border-gold focus:outline-none shrink-0"
      />

      {divider}

      {/* Date selection */}
      <span className={label}>Date</span>
      <input
        type="date"
        value={filters.dateFrom}
        onChange={e => onChange({ ...filters, dateFrom: e.target.value })}
        className="px-2 py-1.5 rounded-full text-xs bg-transparent border border-white/20 text-white/80 focus:border-gold focus:outline-none shrink-0 [color-scheme:dark]"
      />
      <span className="text-white/30 text-xs shrink-0">–</span>
      <input
        type="date"
        value={filters.dateTo}
        onChange={e => onChange({ ...filters, dateTo: e.target.value })}
        className="px-2 py-1.5 rounded-full text-xs bg-transparent border border-white/20 text-white/80 focus:border-gold focus:outline-none shrink-0 [color-scheme:dark]"
      />

      {hasActiveFilters && (
        <>
          {divider}
          <button
            onClick={() =>
              onChange({ disciplines: [], kidsOnly: false, countries: [], dateFrom: '', dateTo: '', age: '' })
            }
            className="px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap text-white/40 hover:text-white border border-white/10 hover:border-white/30 transition-colors shrink-0"
          >
            Clear
          </button>
        </>
      )}
    </div>
  )
}
