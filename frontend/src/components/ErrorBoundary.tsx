import { Component, ReactNode } from 'react'

interface Props { children: ReactNode }
interface State { error: Error | null }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex flex-col items-center justify-center h-screen gap-4 p-8 text-center">
          <p className="text-lg font-semibold text-gray-800 dark:text-gray-200">Ceva a mers gresit</p>
          <p className="text-sm text-gray-400 font-mono">{this.state.error.message}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-brand text-white text-sm rounded-lg hover:bg-brand-light transition-colors"
          >
            Reincarca pagina
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
