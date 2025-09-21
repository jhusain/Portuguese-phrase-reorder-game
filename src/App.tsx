import { useCallback, useEffect, useMemo, useState } from 'react'
import TokenList from './components/TokenList'
import { createProblemSetHash, fetchProblems } from './data/problems'
import { usePersistentState } from './hooks/usePersistentState'
import type { ColorScheme, Problem, TokenFragment } from './types'
import { createFragmentId, evaluateFragments } from './utils/evaluate'
import { shuffle } from './utils/shuffle'

type ProblemsState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; problems: Problem[]; hash: string }

type StatusMessage = {
  title: string
  detail?: string
}

interface ProblemProgress {
  fragments: TokenFragment[]
  solved: boolean
}

interface SessionState {
  current: number | null
  queue: number[]
  progress: ProblemProgress[]
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

function createInitialFragments(problem: Problem, seed: string): TokenFragment[] {
  const baseFragments: TokenFragment[] = problem.tokens.map((_, index) => ({
    id: createFragmentId([index]),
    indices: [index],
    locked: false,
  }))

  return shuffle(baseFragments, seed).map((fragment) => ({
    id: fragment.id,
    indices: [...fragment.indices],
    locked: false,
  }))
}

function createSession(problems: Problem[], seed: string): SessionState {
  if (problems.length === 0) {
    return { current: null, queue: [], progress: [] }
  }

  const order = problems.map((_, index) => index)
  const [current, ...queue] = order

  const progress = problems.map((problem, index) => ({
    fragments: createInitialFragments(problem, `${seed}-${index}`),
    solved: false,
  }))

  return { current, queue, progress }
}

function createSessionSeed(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
}

function createRandomizedSession(problems: Problem[]): SessionState {
  return createSession(problems, createSessionSeed())
}

function App() {
  const scheme = usePreferredColorScheme()

  useEffect(() => {
    if (typeof document === 'undefined') {
      return
    }

    document.documentElement.setAttribute('data-theme', scheme)
  }, [scheme])

  const [state, setState] = useState<ProblemsState>({ status: 'loading' })
  const problems = state.status === 'success' ? state.problems : null
  const problemHash = state.status === 'success' ? state.hash : null

  const sessionInitializer = useCallback((): SessionState | null => {
    if (!problems) {
      return null
    }

    return createRandomizedSession(problems)
  }, [problems])

  const [session, setSession] = usePersistentState<SessionState | null>(
    problemHash ? `portuguese-reorder-session:${problemHash}` : null,
    sessionInitializer,
  )

  useEffect(() => {
    const abortController = new AbortController()

    fetchProblems({ signal: abortController.signal })
      .then((problems) => {
        const hash = createProblemSetHash(problems)
        setState({ status: 'success', problems, hash })
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

  const totalProblems = problems?.length ?? 0

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

    if (state.status === 'success' && totalProblems === 0) {
      return {
        title: 'No practice prompts available',
        detail: 'Add entries to problems.json to begin creating reorder challenges.',
      }
    }

    return null
  }, [state, totalProblems])

  const currentIndex = session?.current ?? null
  const currentProblem = problems && currentIndex != null ? problems[currentIndex] : null
  const currentProgress = currentIndex != null && session ? session.progress[currentIndex] : null

  const solvedCount = session ? session.progress.filter((entry) => entry.solved).length : 0
  const remainingQueue = session?.queue.length ?? 0
  const allSolved = totalProblems > 0 && solvedCount === totalProblems

  const problemEyebrow = useMemo(() => {
    if (statusMessage) {
      if (state.status === 'loading') {
        return 'Preparing your first challenge'
      }

      if (state.status === 'error') {
        return 'Status update'
      }

      return 'Practice workspace'
    }

    if (!currentProblem || !currentProgress || totalProblems === 0) {
      return 'Practice workspace'
    }

    if (currentProgress.solved) {
      if (allSolved) {
        return 'All prompts solved'
      }

      return `Solved ${solvedCount} of ${totalProblems}`
    }

    return `Problem ${solvedCount + 1} of ${totalProblems}`
  }, [
    statusMessage,
    state.status,
    currentProblem,
    currentProgress,
    totalProblems,
    allSolved,
    solvedCount,
  ])

  const handleReorder = (nextFragments: TokenFragment[]) => {
    setSession((previous) => {
      if (!previous || previous.current == null) {
        return previous
      }

      const activeIndex = previous.current
      const nextProgress = previous.progress.map((entry, index) =>
        index === activeIndex
          ? {
              fragments: nextFragments,
              solved: entry.solved,
            }
          : entry,
      )

      return { ...previous, progress: nextProgress }
    })
  }

  const handleSolve = () => {
    if (state.status !== 'success') {
      return
    }

    setSession((previous) => {
      if (!previous || previous.current == null || !problems) {
        return previous
      }

      const activeIndex = previous.current
      const problem = problems[activeIndex]
      if (!problem) {
        return previous
      }
      const progressEntry = previous.progress[activeIndex]

      const evaluation = evaluateFragments(progressEntry.fragments, problem.tokens.length)

      const nextProgress = previous.progress.map((entry, index) =>
        index === activeIndex
          ? {
              fragments: evaluation.fragments,
              solved: entry.solved || evaluation.isSolved,
            }
          : entry,
      )

      const nextQueue = evaluation.isSolved
        ? previous.queue.filter((index) => index !== activeIndex)
        : previous.queue

      return {
        ...previous,
        progress: nextProgress,
        queue: nextQueue,
      }
    })
  }

  const handleSkip = () => {
    setSession((previous) => {
      if (!previous || previous.current == null) {
        return previous
      }

      const activeIndex = previous.current
      const progressEntry = previous.progress[activeIndex]

      if (progressEntry.solved || previous.queue.length === 0) {
        return previous
      }

      const [next, ...rest] = previous.queue

      return {
        ...previous,
        current: next,
        queue: [...rest, activeIndex],
      }
    })
  }

  const handleNext = () => {
    setSession((previous) => {
      if (!previous || previous.queue.length === 0) {
        return previous
      }

      const [next, ...rest] = previous.queue

      return {
        ...previous,
        current: next,
        queue: rest,
      }
    })
  }

  const handleRestart = () => {
    if (!problems || problems.length === 0) {
      return
    }

    setSession(() => createRandomizedSession(problems))
  }

  const canSolve = Boolean(currentProgress && !currentProgress.solved)
  const canSkip = Boolean(currentProgress && !currentProgress.solved && remainingQueue > 0)
  const showNext = Boolean(currentProgress?.solved && remainingQueue > 0)
  const showRestart = Boolean(currentProgress?.solved && remainingQueue === 0 && totalProblems > 0)

  return (
    <div className="app" data-status={state.status}>
      <main className="app__main" aria-live="polite" aria-busy={state.status === 'loading'}>
        <div className="layout">
          <section className="card" aria-label="Practice workspace">
            <header className="card__header">
              <div>
                <p className="card__eyebrow">{problemEyebrow}</p>
                <h2 className="card__title">Arrange the phrase</h2>
              </div>
              <span className="theme-indicator" aria-live="polite">
                {scheme === 'dark' ? 'Dark mode' : 'Light mode'}
              </span>
            </header>

            <div className="card__body workspace__body">
              {statusMessage ? (
                <div className="status" role={state.status === 'error' ? 'alert' : undefined}>
                  <p className="status__title">{statusMessage.title}</p>
                  {statusMessage.detail ? <p className="status__detail">{statusMessage.detail}</p> : null}
                </div>
              ) : currentProblem && currentProgress ? (
                <>
                  <TokenList
                    fragments={currentProgress.fragments}
                    solutionTokens={currentProblem.tokens}
                    onReorder={handleReorder}
                  />
                  {currentProgress.solved ? (
                    <aside className="workspace__note" aria-live="polite">
                      <h3 className="workspace__note-title">Grammar note</h3>
                      <p className="workspace__note-body">{currentProblem.note}</p>
                    </aside>
                  ) : null}
                </>
              ) : null}
            </div>

            <footer className="card__footer workspace__controls" aria-label="Game controls">
              <button
                className="button button--primary"
                type="button"
                onClick={handleSolve}
                disabled={!canSolve}
              >
                Solve phrase
              </button>

              {showNext ? (
                <button className="button button--secondary" type="button" onClick={handleNext}>
                  Next prompt
                </button>
              ) : showRestart ? (
                <button className="button button--secondary" type="button" onClick={handleRestart}>
                  Restart session
                </button>
              ) : (
                <button className="button button--ghost" type="button" onClick={handleSkip} disabled={!canSkip}>
                  Skip for now
                </button>
              )}
            </footer>
          </section>

        </div>
      </main>
    </div>
  )
}

export default App
