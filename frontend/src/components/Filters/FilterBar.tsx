import { Filters } from '../../types/race'

const DISCIPLINES = [
  { value: 'obstacle', label: 'Obstacle', emoji: '🏃' },
  { value: 'bike_road', label: 'Road', emoji: '🚴' },
  { value: 'bike_mtb', label: 'MTB', emoji: '🚵' },
  { value: 'bike_gravel', label: 'Gravel', emoji: '⛰️' },
]

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

  const hasActiveFilters =
    filters.disciplines.length > 0 ||
    filters.kidsOnly ||
    filters.countries.length > 0 ||
    filters.dateFrom ||
    filters.dateTo

  return (
    <div className="bg-[#0f1113]/80 backdrop-blur-sm px-3 py-2 flex items-center gap-2 overflow-x-auto scrollbar-none shrink-0">
      {DISCIPLINES.map(d => {
        const active = filters.disciplines.includes(d.value)
        return (
          <button
            key={d.value}
            onClick={() => toggleDiscipline(d.value)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors border shrink-0 ${
              active
                ? 'border-gold text-gold'
                : 'border-white/20 text-white/50 hover:text-white/80 hover:border-white/40'
            }`}
          >
            <span>{d.emoji}</span>
            <span>{d.label}</span>
            {active && (
              <span className="block w-1 h-1 rounded-full bg-gold ml-0.5" />
            )}
          </button>
        )
      })}

      <button
        onClick={() => onChange({ ...filters, kidsOnly: !filters.kidsOnly })}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors border shrink-0 ${
          filters.kidsOnly
            ? 'border-gold text-gold'
            : 'border-white/20 text-white/50 hover:text-white/80 hover:border-white/40'
        }`}
      >
        Kids ⭐
        {filters.kidsOnly && (
          <span className="block w-1 h-1 rounded-full bg-gold ml-0.5" />
        )}
      </button>

      {hasActiveFilters && (
        <button
          onClick={() =>
            onChange({ disciplines: [], kidsOnly: false, countries: [], dateFrom: '', dateTo: '' })
          }
          className="px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap text-white/30 hover:text-white/60 border border-white/10 hover:border-white/30 transition-colors shrink-0"
        >
          clear
        </button>
      )}
    </div>
  )
}
