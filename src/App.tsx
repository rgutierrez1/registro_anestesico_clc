import { Route, Routes } from 'react-router-dom'
import ListaCasos from './pages/ListaCasos'
import NuevoCaso from './pages/NuevoCaso'
import RegistroIntraoperatorio from './pages/RegistroIntraoperatorio'
import ResumenCaso from './pages/ResumenCaso'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<ListaCasos />} />
      <Route path="/nuevo" element={<NuevoCaso />} />
      <Route path="/caso/:id" element={<RegistroIntraoperatorio />} />
      <Route path="/caso/:id/resumen" element={<ResumenCaso />} />
    </Routes>
  )
}
