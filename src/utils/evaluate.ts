import type { TokenFragment } from '../types'

export interface EvaluationResult {
  fragments: TokenFragment[]
  lockedCount: number
  isSolved: boolean
}

export function createFragmentId(indices: readonly number[]): string {
  if (indices.length === 0) {
    throw new Error('Cannot create a fragment id from an empty index set.')
  }

  const normalized = [...indices].sort((a, b) => a - b)
  return `fragment-${normalized.join('-')}`
}

export function evaluateFragments(
  fragments: readonly TokenFragment[],
  solutionLength: number,
): EvaluationResult {
  const totalTokens = fragments.reduce((sum, fragment) => sum + fragment.indices.length, 0)

  if (totalTokens !== solutionLength) {
    throw new Error('Token fragments do not match the expected solution length.')
  }

  const seen = new Set<number>()
  const orderedIndices: number[] = []

  fragments.forEach((fragment) => {
    fragment.indices.forEach((originalIndex) => {
      if (seen.has(originalIndex)) {
        throw new Error('Encountered duplicate token indices while evaluating fragments.')
      }

      seen.add(originalIndex)
      orderedIndices.push(originalIndex)
    })
  })

  const tokensCorrect = orderedIndices.map(
    (originalIndex, positionIndex) => originalIndex === positionIndex,
  )
  const lockedCount = tokensCorrect.reduce((count, correct) => (correct ? count + 1 : count), 0)

  const groups: Array<{ indices: number[]; locked: boolean }> = []

  orderedIndices.forEach((originalIndex, positionIndex) => {
    const isLocked = tokensCorrect[positionIndex]
    const previousGroup = groups[groups.length - 1]

    if (
      previousGroup &&
      previousGroup.locked === isLocked &&
      previousGroup.indices[previousGroup.indices.length - 1] + 1 === originalIndex
    ) {
      previousGroup.indices.push(originalIndex)
      return
    }

    groups.push({ indices: [originalIndex], locked: isLocked })
  })

  const fragmentsResult: TokenFragment[] = groups.map(({ indices, locked }) => ({
    id: createFragmentId(indices),
    indices: [...indices],
    locked,
  }))

  return {
    fragments: fragmentsResult,
    lockedCount,
    isSolved: lockedCount === solutionLength,
  }
}

export function getFragmentText(fragment: TokenFragment, solutionTokens: readonly string[]): string {
  return fragment.indices.map((index) => solutionTokens[index]).join(' ')
}
