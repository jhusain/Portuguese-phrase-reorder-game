/**
 * Deterministically hashes a seed value into a 32-bit integer.
 */
function hashSeed(seed: string | number): number {
  if (typeof seed === 'number' && Number.isFinite(seed)) {
    const normalized = Math.floor(seed) >>> 0
    return normalized === 0 ? 0x1a2b3c4d : normalized
  }

  const text = String(seed)
  let hash = 0x811c9dc5 // FNV-1a 32-bit offset basis
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }

  hash >>>= 0
  return hash === 0 ? 0x1a2b3c4d : hash
}

function mulberry32(seed: number) {
  let t = seed >>> 0
  return function generate() {
    t += 0x6d2b79f5
    let result = Math.imul(t ^ (t >>> 15), t | 1)
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61)
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296
  }
}

export type RandomGenerator = () => number

export function createSeededGenerator(seed: string | number): RandomGenerator {
  return mulberry32(hashSeed(seed))
}

export function shuffle<T>(items: readonly T[], seed: string | number): T[] {
  const result = [...items]
  if (result.length < 2) {
    return result
  }

  const random = createSeededGenerator(seed)
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1))
    ;[result[index], result[swapIndex]] = [result[swapIndex], result[index]]
  }

  return result
}
