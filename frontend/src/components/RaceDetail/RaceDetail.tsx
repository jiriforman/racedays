import { differenceInDays, parseISO, format } from 'date-fns'
import { Race } from '../../types/race'

const DISCIPLINE_LABEL: Record<string, string> = {
  obstacle: 'Obstacle',
  bike_road: 'Road',
  bike_mtb: 'MTB',
  bike_gravel: 'Gravel',
}

const DISCIPLINE_EMOJI: Record<string, string> = {
  obstacle: '🏃',
  bike_road: '🚴',
  bike_mtb: '🚵',
  bike_gravel: '⛰️',
}

const COUNTRY_FLAG: Record<string, string> = {
  CZ: '🇨🇿', SK: '🇸🇰', AT: '🇦🇹', PL: '🇵🇱', DE: '🇩🇪', HU: '🇭🇺',
}

interface Props {
  race: Race
  onClose: () => void
}

export default function RaceDetail({ race, onClose }: Props) {
  const daysUntil = differenceInDays(parseISO(race.date_start), new Date())

  const dateStr = (() => {
    try {
      const start = format(parseISO(race.date_start), 'd MMM yyyy')
      if (race.date_end && race.date_end !== race.date_start) {
        return `${start} – ${format(parseISO(race.date_end), 'd MMM yyyy')}`
      }
      return start
    } catch {
      return race.date_start
    }
  })()

  return (
    <div className="bg-surface-700 h-full flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2 shrink-0">
        <span className="text-gold text-xs tracking-widest uppercase font-semibold">
          {DISCIPLINE_EMOJI[race.discipline]} {DISCIPLINE_LABEL[race.discipline] ?? race.discipline}
        </span>
        <button
          onClick={onClose}
          className="w-7 h-7 rounded-full flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-colors text-lg leading-none"
          aria-label="Close"
        >
          ×
        </button>
      </div>

      {/* Scrollable content */}
      <div className="overflow-y-auto flex-1 px-4 pb-4 flex flex-col gap-3">
        {/* Title */}
        <h2 className="text-2xl font-bold text-white leading-tight">{race.title}</h2>

        {/* Location */}
        <div className="flex items-center gap-1.5 text-white/50 text-sm">
          <span>📍</span>
          <span>{race.location_name}</span>
          {race.country && (
            <span className="ml-1">{COUNTRY_FLAG[race.country] ?? race.country}</span>
          )}
        </div>

        {/* Date block */}
        <div className="flex items-center gap-3">
          <div className="border border-gold/40 rounded-lg px-3 py-2">
            <span className="font-mono text-xl font-bold text-white">{dateStr}</span>
          </div>
          {daysUntil >= 0 && (
            <span className="text-gold text-sm font-mono font-medium">
              IN {daysUntil} DAY{daysUntil !== 1 ? 'S' : ''}
            </span>
          )}
          {daysUntil < 0 && (
            <span className="text-white/30 text-sm font-mono">
              {Math.abs(daysUntil)} days ago
            </span>
          )}
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-2">
          <span className="text-xs px-2.5 py-1 rounded-full text-gold bg-gold/15 font-medium">
            {DISCIPLINE_EMOJI[race.discipline]} {DISCIPLINE_LABEL[race.discipline] ?? race.discipline}
          </span>
          {race.is_kids_friendly && (
            <span className="text-xs px-2.5 py-1 rounded-full text-gold bg-gold/15 font-medium">
              ⭐ Kids-friendly
            </span>
          )}
        </div>

        {/* Description */}
        {race.description && (
          <p className="text-white/60 text-sm leading-relaxed">{race.description}</p>
        )}

        {/* Distances */}
        {race.distances && race.distances.length > 0 && (
          <div>
            <p className="text-white/30 text-xs uppercase tracking-widest mb-2">Distances</p>
            <div className="flex flex-wrap gap-2">
              {race.distances.map((d, i) => (
                <span
                  key={i}
                  className="text-xs px-2.5 py-1 rounded-full border border-white/10 text-white/60 font-mono"
                >
                  {d.name || `${d.km} km`}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Organizer */}
        {race.organizer && (
          <p className="text-white/30 text-xs">
            Organizer: <span className="text-white/50">{race.organizer}</span>
          </p>
        )}
      </div>

      {/* CTA */}
      <div className="px-4 pb-4 pt-2 shrink-0">
        {race.registration_url ? (
          <a
            href={race.registration_url}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full text-center bg-gold hover:bg-gold/90 text-surface-900 font-bold py-3 rounded-lg text-sm transition-colors"
          >
            Register →
          </a>
        ) : (
          <button
            disabled
            className="block w-full text-center bg-white/5 text-white/20 font-bold py-3 rounded-lg text-sm cursor-not-allowed"
          >
            No registration link
          </button>
        )}
      </div>
    </div>
  )
}
