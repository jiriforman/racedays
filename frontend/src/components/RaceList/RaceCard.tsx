import { Race } from '../../types/race'
import { format, parseISO } from 'date-fns'

const DISCIPLINE_LABEL: Record<string, string> = {
  obstacle: 'Obstacle',
  bike_road: 'Road',
  bike_mtb: 'MTB',
  bike_gravel: 'Gravel',
}

const COUNTRY_FLAG: Record<string, string> = {
  CZ: '🇨🇿', SK: '🇸🇰', AT: '🇦🇹', PL: '🇵🇱', DE: '🇩🇪', HU: '🇭🇺',
}

interface Props {
  race: Race
  selected: boolean
  onClick: () => void
}

export default function RaceCard({ race, selected, onClick }: Props) {
  const dateStr = (() => {
    try {
      const start = format(parseISO(race.date_start), 'd MMM yyyy')
      if (race.date_end && race.date_end !== race.date_start) {
        return `${start} – ${format(parseISO(race.date_end), 'd MMM')}`
      }
      return start
    } catch {
      return race.date_start
    }
  })()

  return (
    <div
      onClick={onClick}
      className={`px-4 py-3 cursor-pointer transition-colors hover:bg-white/5 border-b border-white/[0.06] ${
        selected
          ? 'bg-white/[0.04] border-l-2 border-l-gold'
          : ''
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-white text-sm leading-snug">{race.title}</h3>
        <div className="flex gap-1 shrink-0 flex-wrap justify-end">
          <span className="text-xs px-2 py-0.5 rounded-full font-medium text-gold bg-gold/15">
            {DISCIPLINE_LABEL[race.discipline] ?? race.discipline}
          </span>
          {race.is_kids_friendly && (
            <span className="text-xs px-2 py-0.5 rounded-full font-medium text-gold bg-gold/15">
              ⭐
            </span>
          )}
        </div>
      </div>

      <p className="text-xs text-white/50 mt-1 font-mono">
        {dateStr} &middot; {COUNTRY_FLAG[race.country] ?? ''} {race.location_name}
      </p>

      {race.distances && race.distances.length > 0 && (
        <p className="text-xs text-white/30 mt-0.5 font-mono">
          {race.distances.map(d => d.name || `${d.km} km`).join(' · ')}
        </p>
      )}
    </div>
  )
}
