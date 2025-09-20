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

function normalizeIndices(indices: readonly number[]): number[] {
  return [...indices].sort((a, b) => a - b)
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
  const positions: Array<{ fragmentIndex: number; originalIndex: number }> = []
  const fragmentPositions: number[][] = fragments.map(() => [])

  fragments.forEach((fragment, fragmentIndex) => {
    fragment.indices.forEach((originalIndex) => {
      if (seen.has(originalIndex)) {
        throw new Error('Encountered duplicate token indices while evaluating fragments.')
      }
      seen.add(originalIndex)

      const positionIndex = positions.length
      positions.push({ fragmentIndex, originalIndex })
      fragmentPositions[fragmentIndex].push(positionIndex)
    })
  })

  const tokensCorrect = positions.map((position, positionIndex) => position.originalIndex === positionIndex)

  const fragmentCorrect = fragmentPositions.map((positionIndexes) =>
    positionIndexes.length > 0 && positionIndexes.every((positionIndex) => tokensCorrect[positionIndex]),
  )

  const result: TokenFragment[] = []
  let lockedCount = 0

  fragments.forEach((fragment, index) => {
    const sortedIndices = normalizeIndices(fragment.indices)
    if (fragmentCorrect[index]) {
      lockedCount += sortedIndices.length

      const previous = result[result.length - 1]
      if (previous && previous.locked) {
        const previousTail = previous.indices[previous.indices.length - 1]
        if (previousTail + 1 === sortedIndices[0]) {
          const combinedIndices = [...previous.indices, ...sortedIndices]
          result[result.length - 1] = {
            id: createFragmentId(combinedIndices),
            indices: combinedIndices,
            locked: true,
          }
          return
        }
      }

      result.push({
        id: createFragmentId(sortedIndices),
        indices: sortedIndices,
        locked: true,
      })
      return
    }

    result.push({
      id: createFragmentId(sortedIndices),
      indices: sortedIndices,
      locked: false,
    })
  })

  return {
    fragments: result,
    lockedCount,
    isSolved: lockedCount === solutionLength,
  }
}

export function getFragmentText(fragment: TokenFragment, solutionTokens: readonly string[]): string {
  return fragment.indices.map((index) => solutionTokens[index]).join(' ')
}
