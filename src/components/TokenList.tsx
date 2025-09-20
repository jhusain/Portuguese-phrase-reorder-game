import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable'
import { useEffect, useMemo, useState } from 'react'
import type { TokenFragment } from '../types'
import { getFragmentText } from '../utils/evaluate'
import Token from './Token'
import styles from './Token.module.css'

interface TokenListProps {
  fragments: readonly TokenFragment[]
  solutionTokens: readonly string[]
  onReorder: (next: TokenFragment[]) => void
}

type DropIndicator = {
  targetId: string
  position: 'before' | 'after'
} | null

function TokenList({ fragments, solutionTokens, onReorder }: TokenListProps) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [indicator, setIndicator] = useState<DropIndicator>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  useEffect(() => {
    setIndicator(null)
  }, [fragments])

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragCancel = () => {
    setActiveId(null)
    setIndicator(null)
  }

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event
    if (!over) {
      if (fragments.length === 0) {
        setIndicator(null)
        return
      }

      const last = fragments[fragments.length - 1]
      if (last.id === active.id && fragments.length > 1) {
        const previous = fragments[fragments.length - 2]
        setIndicator({ targetId: previous.id, position: 'after' })
      } else if (last.id !== active.id) {
        setIndicator({ targetId: last.id, position: 'after' })
      } else {
        setIndicator(null)
      }
      return
    }

    const activeId = active.id as string
    const overId = over.id as string

    if (activeId === overId) {
      setIndicator(null)
      return
    }

    const oldIndex = fragments.findIndex((fragment) => fragment.id === activeId)
    const overIndex = fragments.findIndex((fragment) => fragment.id === overId)

    if (oldIndex === -1 || overIndex === -1) {
      setIndicator(null)
      return
    }

    const position: 'before' | 'after' = overIndex > oldIndex ? 'after' : 'before'
    setIndicator({ targetId: overId, position })
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    setActiveId(null)
    setIndicator(null)

    if (!over) {
      return
    }

    const activeId = active.id as string
    const overId = over.id as string

    if (activeId === overId) {
      return
    }

    const oldIndex = fragments.findIndex((fragment) => fragment.id === activeId)
    const newIndex = fragments.findIndex((fragment) => fragment.id === overId)

    if (oldIndex === -1 || newIndex === -1) {
      return
    }

    const currentFragments = Array.from(fragments)
    const reordered = arrayMove(currentFragments, oldIndex, newIndex)
    onReorder(reordered)
  }

  const activeFragment = useMemo(
    () => fragments.find((fragment) => fragment.id === activeId) ?? null,
    [activeId, fragments],
  )

  const activeText = useMemo(() => {
    if (!activeFragment) {
      return ''
    }

    return getFragmentText(activeFragment, solutionTokens)
  }, [activeFragment, solutionTokens])

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragCancel={handleDragCancel}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={fragments.map((fragment) => fragment.id)} strategy={horizontalListSortingStrategy}>
        <ul className="workspace__tokens" aria-live="polite">
          {fragments.map((fragment) => {
            const text = getFragmentText(fragment, solutionTokens)
            const dropIndicator = indicator && indicator.targetId === fragment.id ? indicator.position : null
            return <Token key={fragment.id} fragment={fragment} text={text} dropIndicator={dropIndicator} />
          })}
        </ul>
      </SortableContext>
      <DragOverlay dropAnimation={null}>
        {activeFragment ? (
          <div
            className={styles.token}
            data-locked={activeFragment.locked ? 'true' : undefined}
            data-dragging="true"
          >
            <span className={styles.text}>{activeText}</span>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}

export default TokenList
