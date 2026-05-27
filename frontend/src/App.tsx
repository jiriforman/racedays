import { Routes, Route } from 'react-router-dom'
import MapView from './pages/MapView'
import SubmitRace from './pages/SubmitRace'
import SuggestSource from './pages/SuggestSource'
import Admin from './pages/Admin'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<MapView />} />
      <Route path="/submit" element={<SubmitRace />} />
      <Route path="/suggest-source" element={<SuggestSource />} />
      <Route path="/admin" element={<Admin />} />
    </Routes>
  )
}
