import { CSS } from '@dnd-kit/utilities'
import { useSortable } from '@dnd-kit/sortable'
import type { CSSProperties, HTMLAttributes } from 'react'
import type { TokenFragment } from '../types'
import styles from './Token.module.css'

export interface TokenProps {
  fragment: TokenFragment
  text: string
  dropIndicator?: 'before' | 'after' | null
}

function Token({ fragment, text, dropIndicator }: TokenProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: fragment.id,
    disabled: fragment.locked,
  })

  const sortableAttributes = attributes as HTMLAttributes<HTMLLIElement>
  const { tabIndex, ...restAttributes } = sortableAttributes

  const style: CSSProperties = {
    transform: transform ? CSS.Transform.toString(transform) : undefined,
    transition,
  }

  const resolvedTabIndex = fragment.locked ? -1 : tabIndex ?? 0

  return (
    <li
      ref={setNodeRef}
      className={styles.token}
      style={style}
      data-locked={fragment.locked ? 'true' : undefined}
      data-dragging={isDragging ? 'true' : undefined}
      data-drop-indicator={dropIndicator ?? undefined}
      tabIndex={resolvedTabIndex}
      aria-disabled={fragment.locked || undefined}
      {...restAttributes}
      {...(fragment.locked ? undefined : listeners)}
    >
      <span className={styles.text}>{text}</span>
    </li>
  )
}

export default Token
