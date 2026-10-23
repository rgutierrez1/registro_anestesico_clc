import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Estado {
  error: Error | null
}

export class ErrorBoundary extends Component<{ children: ReactNode }, Estado> {
  state: Estado = { error: null }

  static getDerivedStateFromError(error: Error): Estado {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Error en la aplicación:', error, info.componentStack)
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children
    return (
      <div className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-4 px-6 py-10">
        <h1 className="text-xl font-bold text-slate-900">Ocurrió un error inesperado</h1>
        <p className="text-slate-600">
          La pantalla no pudo mostrarse. Los casos guardados en este dispositivo no se perdieron. Probá recargar la
          página; si vuelve a pasar, volvé a la lista de casos.
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="min-h-[48px] rounded-xl bg-sky-600 px-4 font-medium text-white hover:bg-sky-700"
          >
            Recargar la página
          </button>
          <button
            type="button"
            onClick={() => {
              window.location.hash = '#/'
              this.setState({ error: null })
            }}
            className="min-h-[48px] rounded-xl bg-slate-200 px-4 font-medium text-slate-800 hover:bg-slate-300"
          >
            Volver a la lista de casos
          </button>
        </div>
        <details className="text-sm text-slate-500">
          <summary className="cursor-pointer">Detalle técnico</summary>
          <pre className="mt-2 whitespace-pre-wrap break-words rounded-lg bg-slate-100 p-3">{error.message}</pre>
        </details>
      </div>
    )
  }
}
