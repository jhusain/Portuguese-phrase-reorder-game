import { useEffect, useMemo, useState } from 'react'
import { fetchProblems } from './data/problems'
import type { ColorScheme, Problem } from './types'
import { shuffle } from './utils/shuffle'

type ProblemsState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; problems: Problem[] }

type StatusMessage = {
  title: string
  detail?: string
}

function getPreferredColorScheme(): ColorScheme {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return 'light'
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function usePreferredColorScheme(): ColorScheme {
  const [scheme, setScheme] = useState<ColorScheme>(() => getPreferredColorScheme())

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = (event: MediaQueryListEvent | MediaQueryList) => {
      setScheme(event.matches ? 'dark' : 'light')
    }

    setScheme(mediaQuery.matches ? 'dark' : 'light')

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleChange)

      return () => mediaQuery.removeEventListener('change', handleChange)
    }

    mediaQuery.addListener(handleChange)
    return () => mediaQuery.removeListener(handleChange)
  }, [])

  return scheme
}

function App() {
  const scheme = usePreferredColorScheme()

  useEffect(() => {
    if (typeof document === 'undefined') {
      return
    }

    document.documentElement.setAttribute('data-theme', scheme)
  }, [scheme])

  const [sessionSeed] = useState(() => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`)
  const [state, setState] = useState<ProblemsState>({ status: 'loading' })

  useEffect(() => {
    const abortController = new AbortController()

    fetchProblems({ signal: abortController.signal })
      .then((problems) => {
        setState({ status: 'success', problems })
      })
      .catch((error) => {
        if (abortController.signal.aborted) {
          return
        }

        if (error instanceof Error && error.name === 'AbortError') {
          return
        }

        const message = error instanceof Error ? error.message : 'Unknown error'
        setState({ status: 'error', message })
      })

    return () => {
      abortController.abort()
    }
  }, [])

  const previewProblem = state.status === 'success' ? state.problems.at(0) : undefined
  const previewTokens = useMemo(() => {
    if (!previewProblem) {
      return []
    }

    return shuffle(previewProblem.tokens, `${sessionSeed}-preview`)
  }, [previewProblem, sessionSeed])

  const statusMessage: StatusMessage | null = useMemo(() => {
    if (state.status === 'loading') {
      return {
        title: 'Loading practice problems…',
        detail: 'Fetching European Portuguese introductions from the local dataset.',
      }
    }

    if (state.status === 'error') {
      return {
        title: 'Unable to load problems',
        detail: state.message,
      }
    }

    if (previewProblem == null) {
      return {
        title: 'No practice prompts available',
        detail: 'Add entries to problems.json to begin creating reorder challenges.',
      }
    }

    return null
  }, [state, previewProblem])

  return (
    <div className="app" data-status={state.status}>
      <header className="app__hero" role="banner">
        <div className="hero__content">
          <p className="hero__eyebrow">European Portuguese study tool</p>
          <h1 className="hero__title">Portuguese Phrase Reorder Game</h1>
          <p className="hero__subtitle">
            Reorder shuffled sentence tokens to practice word order, contractions, and pronunciation cues. The interface adapts
            to your system&apos;s {scheme} theme automatically.
          </p>
        </div>
      </header>

      <main className="app__main" aria-live="polite" aria-busy={state.status === 'loading'}>
        <div className="layout">
          <section className="card" aria-label="Practice prompt preview">
            <header className="card__header">
              <div>
                <p className="card__eyebrow">
                  {state.status === 'success' && previewProblem
                    ? `Problem 1 of ${state.problems.length}`
                    : 'Preparing your first challenge'}
                </p>
                <h2 className="card__title">Arrange the upcoming phrase</h2>
              </div>
              <span className="theme-indicator" aria-live="polite">
                {scheme === 'dark' ? 'Dark mode' : 'Light mode'}
              </span>
            </header>

            <div className="card__body">
              {statusMessage ? (
                <div className="status" role={state.status === 'error' ? 'alert' : undefined}>
                  <p className="status__title">{statusMessage.title}</p>
                  {statusMessage.detail ? <p className="status__detail">{statusMessage.detail}</p> : null}
                </div>
              ) : (
                <>
                  <p className="card__description">
                    Tokens start in the correct order inside the dataset but will be shuffled for each session. Drag-and-drop
                    controls arrive in a later step—this preview demonstrates the responsive layout.
                  </p>
                  <ul className="token-grid" aria-label="Preview of shuffled tokens">
                    {previewTokens.map((token, index) => (
                      <li key={`${token}-${index}`} className="token-chip">
                        {token}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>

            <footer className="card__footer" aria-label="Game controls">
              <button className="button button--primary" type="button" disabled>
                Solve phrase
              </button>
              <button className="button button--ghost" type="button" disabled>
                Skip for now
              </button>
            </footer>
          </section>

          <section className="info card card--surface" aria-labelledby="how-it-works">
            <header className="card__header">
              <div>
                <p className="card__eyebrow">What to expect</p>
                <h2 id="how-it-works" className="card__title">
                  Practice overview
                </h2>
              </div>
            </header>
            <div className="card__body">
              <ol className="info__steps">
                <li>Review the shuffled Portuguese tokens displayed in the workspace.</li>
                <li>Drag tokens into position to form a grammatically correct sentence.</li>
                <li>Press <strong>Solve</strong> to lock correct sequences, merge them, and reveal study notes.</li>
              </ol>
              <p className="info__note">
                Notes explaining contractions and grammar will appear after the full solution is correct. A restart option becomes
                available once you solve every prompt.
              </p>
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}

export default App
