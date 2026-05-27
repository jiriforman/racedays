import { Race } from '../../types/race'
import { format, parseISO } from 'date-fns'

const DISCIPLINE_LABEL: Record<string, string> = {
  obstacle: 'Obstacle',
  bike_road: 'Road',
  bike_mtb: 'MTB',
  bike_gravel: 'Gravel',
}

const DISCIPLINE_COLOR: Record<string, string> = {
  obstacle: 'bg-orange-100 text-orange-700',
  bike_road: 'bg-green-100 text-green-700',
  bike_mtb: 'bg-emerald-100 text-emerald-700',
  bike_gravel: 'bg-teal-100 text-teal-700',
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
      className={`px-4 py-3 border-b border-gray-100 cursor-pointer transition-colors hover:bg-gray-50 ${
        selected ? 'bg-blue-50 border-l-[3px] border-l-blue-500' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-gray-900 text-sm leading-snug">{race.title}</h3>
        <div className="flex gap-1 shrink-0 flex-wrap justify-end">
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-medium ${DISCIPLINE_COLOR[race.discipline] ?? 'bg-gray-100 text-gray-600'}`}
          >
            {DISCIPLINE_LABEL[race.discipline] ?? race.discipline}
          </span>
          {race.is_kids_friendly && (
            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-yellow-100 text-yellow-700">
              Kids ⭐
            </span>
          )}
        </div>
      </div>

      <p className="text-xs text-gray-500 mt-1">
        {dateStr} &middot; {COUNTRY_FLAG[race.country] ?? ''} {race.location_name}
      </p>

      {race.distances && race.distances.length > 0 && (
        <p className="text-xs text-gray-400 mt-0.5">
          {race.distances.map(d => d.name || `${d.km} km`).join(' · ')}
        </p>
      )}

      {race.registration_url && (
        <a
          href={race.registration_url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          className="inline-block mt-1.5 text-xs text-blue-600 font-medium hover:underline"
        >
          Register →
        </a>
      )}
    </div>
  )
}
