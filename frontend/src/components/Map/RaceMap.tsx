import { useEffect } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet'
import { Race } from '../../types/race'

const DISCIPLINE_COLOR: Record<string, string> = {
  obstacle: '#F97316',
  bike_road: '#22C55E',
  bike_mtb: '#10B981',
  bike_gravel: '#14B8A6',
}

function FlyToSelected({ races, selectedId }: { races: Race[]; selectedId: string | null }) {
  const map = useMap()
  useEffect(() => {
    if (!selectedId) return
    const race = races.find(r => r.id === selectedId)
    if (race?.lat != null && race?.lng != null) {
      map.flyTo([race.lat, race.lng], Math.max(map.getZoom(), 11), { duration: 0.6 })
    }
  }, [selectedId, races, map])
  return null
}

interface Props {
  races: Race[]
  selectedRaceId: string | null
  onSelectRace: (id: string) => void
}

export default function RaceMap({ races, selectedRaceId, onSelectRace }: Props) {
  const mappable = races.filter(r => r.lat != null && r.lng != null)

  return (
    <MapContainer
      center={[49.8, 15.5]}
      zoom={7}
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      <FlyToSelected races={races} selectedId={selectedRaceId} />
      {mappable.map(race => {
        const isSelected = selectedRaceId === race.id
        const color = DISCIPLINE_COLOR[race.discipline] ?? '#6B7280'
        return (
          <CircleMarker
            key={race.id}
            center={[race.lat!, race.lng!]}
            radius={race.is_kids_friendly ? 10 : 8}
            pathOptions={{
              color: isSelected ? '#1D4ED8' : color,
              fillColor: color,
              fillOpacity: 0.85,
              weight: isSelected ? 3 : 1.5,
            }}
            eventHandlers={{ click: () => onSelectRace(race.id) }}
          >
            <Popup>
              <div className="text-sm min-w-[160px]">
                <p className="font-semibold text-gray-900">{race.title}</p>
                <p className="text-gray-500 text-xs mt-0.5">
                  {race.date_start} · {race.location_name}
                </p>
                {race.is_kids_friendly && (
                  <p className="text-yellow-600 text-xs mt-0.5">⭐ Kids-friendly</p>
                )}
                {race.registration_url && (
                  <a
                    href={race.registration_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block mt-1.5 text-xs text-blue-600 font-medium hover:underline"
                  >
                    Register →
                  </a>
                )}
              </div>
            </Popup>
          </CircleMarker>
        )
      })}
    </MapContainer>
  )
}
