import { Component } from 'react'

/**
 * React class-based error boundary.
 *
 * Usage — wrap any subtree to catch render/lifecycle errors:
 *   <ErrorBoundary>
 *     <SomeComponent />
 *   </ErrorBoundary>
 *
 * Props:
 *   - fallback ({ error, reset }) => ReactNode  — custom fallback UI
 *   - onReset () => void                        — called when "Try again" fires
 *   - children
 */
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
    this.handleReset = this.handleReset.bind(this)
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    if (import.meta.env.DEV) {
      console.error('[ErrorBoundary]', error, info.componentStack)
    }
  }

  handleReset() {
    this.setState({ hasError: false, error: null })
    this.props.onReset?.()
  }

  render() {
    if (!this.state.hasError) return this.props.children

    if (this.props.fallback) {
      return this.props.fallback({ error: this.state.error, reset: this.handleReset })
    }

    return (
      <div className="errorBoundary" role="alert">
        <div className="errorBoundary__content">
          <div className="errorBoundary__icon" aria-hidden>⚠️</div>
          <h2 className="errorBoundary__title">Something went wrong</h2>
          <p className="errorBoundary__desc">
            An unexpected error occurred. Try refreshing the page or returning to the home screen.
          </p>
          {import.meta.env.DEV && this.state.error ? (
            <pre className="errorBoundary__detail">
              {this.state.error.message}
            </pre>
          ) : null}
          <div className="errorBoundary__actions">
            <button
              type="button"
              className="btn btn--primary"
              onClick={this.handleReset}
            >
              Try again
            </button>
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => window.location.assign('/')}
            >
              Go to home
            </button>
          </div>
        </div>
      </div>
    )
  }
}
