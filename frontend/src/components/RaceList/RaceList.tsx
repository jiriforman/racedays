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
      <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
        Loading races…
      </div>
    )
  }

  if (races.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-32 gap-1 text-center px-4">
        <span className="text-gray-400 text-sm">No races found</span>
        <span className="text-gray-300 text-xs">Try adjusting the filters</span>
      </div>
    )
  }

  return (
    <div>
      <div className="px-4 py-2 text-xs font-medium text-gray-400 border-b border-gray-100 bg-gray-50">
        {races.length} race{races.length !== 1 ? 's' : ''}
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
