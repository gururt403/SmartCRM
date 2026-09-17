import { Component } from 'react'
import { ErrorState } from '@/components/ui/states'

/** Last line of defence: a render crash shows a recoverable panel, not a blank page. */
export class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('Unhandled UI error', error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen items-center justify-center p-6">
          <ErrorState
            title="This page hit an unexpected error"
            error={{ message: 'Reloading usually fixes it. If it keeps happening, check the browser console.' }}
            onRetry={() => window.location.reload()}
          />
        </div>
      )
    }
    return this.props.children
  }
}
