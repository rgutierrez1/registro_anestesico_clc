# Registro Anestésico

Aplicación web para registrar, en un iPad u otra tablet, la información de una
anestesia durante una cirugía: datos del paciente, tipo de anestesia, técnicas
regionales, monitorización, signos vitales a lo largo del tiempo, fármacos
administrados, balance de fluidos y eventos/incidencias. Al cerrar el caso
genera un resumen listo para imprimir o exportar a PDF.

**Estado actual:** prototipo funcional para uso individual (un solo
anestesiólogo/a). Todos los datos se guardan localmente en el dispositivo
(IndexedDB, vía Dexie) — no hay backend ni sincronización entre dispositivos.

## Requisitos

- Node.js 18 o superior

## Desarrollo

```bash
npm install
npm run dev
```

Esto levanta un servidor local. Para probarlo desde el iPad (en la misma red
Wi-Fi que la computadora), abrí en Safari la URL "Network" que muestra la
terminal (algo como `http://192.168.x.x:5173`).

## Build de producción

```bash
npm run build
```

Genera una carpeta `dist/` con archivos estáticos que se pueden alojar en
cualquier hosting estático (Netlify, Vercel, GitHub Pages, un servidor propio,
etc.) o abrir directamente en el iPad.

## Uso en el iPad como "app"

Una vez desplegado en una URL (o accedido en red local), desde Safari en el
iPad se puede tocar "Compartir" → "Agregar a pantalla de inicio" para que se
abra a pantalla completa, sin la barra de Safari, como una app nativa.

## Datos y privacidad

Toda la información del paciente queda guardada **solo en el navegador de ese
dispositivo** (IndexedDB). Borrar los datos del sitio en Safari, o desinstalar
la app de la pantalla de inicio, elimina los registros. No hay copia de
seguridad automática: para conservar un caso a largo plazo, usar "Imprimir /
Exportar PDF" desde el resumen del caso finalizado.

## Estructura del proyecto

- `src/types.ts` — modelo de datos de un caso anestésico.
- `src/db.ts` — base de datos local (Dexie/IndexedDB).
- `src/constants.ts` — listas de opciones (ASA, fármacos frecuentes, tipos de
  monitorización, etc.) — el lugar para ajustar el vocabulario clínico.
- `src/pages/` — las 4 pantallas: lista de casos, nuevo caso, registro
  intraoperatorio (pantalla principal en vivo) y resumen/cierre.
- `src/components/` — secciones reutilizables (signos vitales, fármacos,
  fluidos, eventos, técnicas regionales) y el gráfico de signos vitales.

## Próximos pasos posibles

- Multiusuario / multi-dispositivo con sincronización en la nube.
- Exportar/importar casos como archivo (backup manual).
- Plantillas de fármacos y dosis por tipo de cirugía.
- Firma digital del anestesiólogo al cerrar el caso.
