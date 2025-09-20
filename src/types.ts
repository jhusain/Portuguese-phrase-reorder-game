export interface Problem {
  tokens: string[]
  note: string
}

export type ProblemSet = Problem[]

export type ColorScheme = 'light' | 'dark'

export interface TokenFragment {
  /**
   * Unique identifier derived from the indices contained in the fragment.
   * Stable across reorders until the fragment is merged with neighbouring
   * fragments during evaluation.
   */
  id: string
  /**
   * Original token indices represented by this fragment in ascending order.
   */
  indices: number[]
  /**
   * Indicates whether the fragment is locked in place after being solved.
   */
  locked: boolean
}
