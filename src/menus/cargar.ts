import type { Alerta, MenuDef, SeccionDef } from './tipos'

// Deja el JSON en la forma que usa el motor: `abre` siempre como lista y `aviso` como alerta roja.
export function cargarMenu(json: unknown): MenuDef {
  const def = json as MenuDef
  return {
    ...def,
    secciones: def.secciones.map((s: SeccionDef) => ({
      ...s,
      campos: s.campos.map((c) => ({
        ...c,
        alertas: [
          ...(c.alertas ?? []),
          ...(c.aviso ? [{ si: c.aviso.si, nivel: 'roja', mensaje: c.aviso.mensaje, fija: c.aviso.fijo } satisfies Alerta] : []),
        ],
        opciones: c.opciones?.map((o) => ({ ...o, abre: o.abre === undefined ? undefined : ([] as string[]).concat(o.abre) })),
      })),
    })),
  }
}
