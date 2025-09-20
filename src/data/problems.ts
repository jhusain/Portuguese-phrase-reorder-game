import type { Problem, ProblemSet } from '../types'

const PROBLEMS_URL = `${import.meta.env.BASE_URL}problems.json`

export interface FetchProblemsOptions {
  signal?: AbortSignal
}

function isProblem(value: unknown): value is Problem {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const candidate = value as Record<string, unknown>
  return (
    Array.isArray(candidate.tokens) &&
    candidate.tokens.every((token) => typeof token === 'string') &&
    typeof candidate.note === 'string'
  )
}

function normalizeProblems(data: unknown): ProblemSet {
  if (!Array.isArray(data)) {
    throw new Error('Problems payload is not an array as expected.')
  }

  return data.map((item) => {
    if (!isProblem(item)) {
      throw new Error('Encountered a problem entry with unexpected structure.')
    }

    return {
      tokens: [...item.tokens],
      note: item.note,
    }
  })
}

export async function fetchProblems(options: FetchProblemsOptions = {}): Promise<ProblemSet> {
  const { signal } = options

  const response = await fetch(PROBLEMS_URL, {
    headers: { Accept: 'application/json' },
    signal,
  })

  if (!response.ok) {
    throw new Error(`Unable to load problems (${response.status} ${response.statusText}).`)
  }

  const payload = (await response.json()) as unknown
  return normalizeProblems(payload)
}

export function getProblemsUrl(): string {
  return PROBLEMS_URL
}
