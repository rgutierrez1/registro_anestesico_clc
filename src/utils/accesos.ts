import { TIPOS_ACCESO } from '../constants'
import type { AccesoVascular } from '../types'

export function tituloAcceso(a: AccesoVascular): string {
  const corta = TIPOS_ACCESO.find((t) => t.id === a.tipo)?.corta ?? a.tipo
  return a.tipo === 'VVP' && a.calibre ? `${corta} ${a.calibre}` : corta
}

export function ubicacionAcceso(a: AccesoVascular): string {
  return a.lado ? `${a.ubicacion} ${a.lado.toLowerCase()}` : a.ubicacion
}

export function chequeoVVC(a: AccesoVascular): { etiqueta: string; hecho: boolean }[] {
  return [
    { etiqueta: 'Técnica estéril', hecho: a.tecnicaEsteril },
    { etiqueta: 'Apoyo radioscopia', hecho: a.apoyoRadioscopia },
    { etiqueta: 'Ecoguiado', hecho: a.ecoguiado },
  ]
}
