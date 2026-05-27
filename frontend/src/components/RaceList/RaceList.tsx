import { Race } from '../../types/race'
import RaceCard from './RaceCard'

interface Props {
  races: Race[]
  loading: boolean
  selectedRaceId: string | null
  onSelectRace: (id: string | null) => void
}

export default function RaceList({ races, loading, selectedRaceId, onSelectRace }: Props) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-32 text-white/30 text-sm">
        Loading races…
      </div>
    )
  }

  if (races.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-32 gap-1 text-center px-4">
        <span className="text-white/30 text-sm">No races found</span>
        <span className="text-white/20 text-xs">Try adjusting the filters</span>
      </div>
    )
  }

  return (
    <div className="bg-surface-700">
      <div className="px-4 py-2 text-xs font-medium text-white/30 border-b border-white/[0.06] flex items-center justify-between">
        <span>{races.length} race{races.length !== 1 ? 's' : ''}</span>
        <span className="font-mono text-white/20">sorted by date</span>
      </div>
      {races.map(race => (
        <RaceCard
          key={race.id}
          race={race}
          selected={selectedRaceId === race.id}
          onClick={() => onSelectRace(selectedRaceId === race.id ? null : race.id)}
        />
      ))}
    </div>
  )
}
