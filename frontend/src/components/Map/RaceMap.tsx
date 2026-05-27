import { useEffect } from 'react'
import L from 'leaflet'
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet'
import { Race } from '../../types/race'

const DISCIPLINE_EMOJI: Record<string, string> = {
  obstacle: '🏃',
  bike_road: '🚴',
  bike_mtb: '🚵',
  bike_gravel: '⛰️',
}

function createRaceIcon(race: Race, isSelected: boolean): L.DivIcon {
  const emoji = DISCIPLINE_EMOJI[race.discipline] ?? '🏁'
  const selectedClass = isSelected ? ' race-marker--selected' : ''
  const star = race.is_kids_friendly
    ? '<span class="race-marker__star">⭐</span>'
    : ''
  return L.divIcon({
    className: '',
    html: `<div class="race-marker${selectedClass}">${emoji}${star}</div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -22],
  })
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
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        subdomains="abcd"
        maxZoom={20}
      />
      <FlyToSelected races={races} selectedId={selectedRaceId} />
      {mappable.map(race => {
        const isSelected = selectedRaceId === race.id
        return (
          <Marker
            key={`${race.id}-${isSelected}`}
            position={[race.lat!, race.lng!]}
            icon={createRaceIcon(race, isSelected)}
            eventHandlers={{ click: () => onSelectRace(race.id) }}
          />
        )
      })}
    </MapContainer>
  )
}
