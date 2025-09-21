import type { Problem, ProblemSet } from '../types'

const PROBLEMS_URL = `${import.meta.env.BASE_URL}problems.json`

export interface FetchProblemsOptions {
  signal?: AbortSignal
}

export interface ProblemSetLoadResult {
  problems: ProblemSet
  hash: string
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

export function createProblemSetHash(problems: ProblemSet): string {
  const digestSource = problems
    .map((problem) => `${problem.tokens.join('\u0000')}\u0001${problem.note}`)
    .join('\u0002')

  let hash = 0
  for (let index = 0; index < digestSource.length; index += 1) {
    hash = (hash * 31 + digestSource.charCodeAt(index)) | 0
  }

  return `v1-${(hash >>> 0).toString(36)}`
}

export async function fetchProblems(options: FetchProblemsOptions = {}): Promise<ProblemSetLoadResult> {
  const { signal } = options

  const response = await fetch(PROBLEMS_URL, {
    headers: { Accept: 'application/json' },
    signal,
  })

  if (!response.ok) {
    throw new Error(`Unable to load problems (${response.status} ${response.statusText}).`)
  }

  const payload = (await response.json()) as unknown
  const problems = normalizeProblems(payload)
  const hash = createProblemSetHash(problems)

  return { problems, hash }
}

export function getProblemsUrl(): string {
  return PROBLEMS_URL
}
