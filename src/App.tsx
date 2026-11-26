import { Route, Routes } from 'react-router-dom'
import FichaSeguimientoUDA from './pages/FichaSeguimientoUDA'
import ListaCasos from './pages/ListaCasos'
import ListaUDA from './pages/ListaUDA'
import NuevoBloqueo from './pages/NuevoBloqueo'
import NuevoCaso from './pages/NuevoCaso'
import RegistroBloqueoIndependiente from './pages/RegistroBloqueoIndependiente'
import RegistroIntraoperatorio from './pages/RegistroIntraoperatorio'
import ResumenCaso from './pages/ResumenCaso'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<ListaCasos />} />
      <Route path="/nuevo" element={<NuevoCaso />} />
      <Route path="/bloqueo/nuevo" element={<NuevoBloqueo />} />
      <Route path="/bloqueo/:id" element={<RegistroBloqueoIndependiente />} />
      <Route path="/uda" element={<ListaUDA />} />
      <Route path="/uda/:id" element={<FichaSeguimientoUDA />} />
      <Route path="/caso/:id" element={<RegistroIntraoperatorio />} />
      <Route path="/caso/:id/resumen" element={<ResumenCaso />} />
    </Routes>
  )
}
