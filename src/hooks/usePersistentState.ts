import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react'

interface PersistentStateOptions<T> {
  storage?: Storage
  serialize?: (value: T) => string
  deserialize?: (value: string) => T
}

function defaultSerialize<T>(value: T): string {
  return JSON.stringify(value)
}

function defaultDeserialize<T>(value: string): T {
  return JSON.parse(value) as T
}

export function usePersistentState<T>(
  key: string | null,
  initializer: () => T,
  options: PersistentStateOptions<T> = {},
): [T, Dispatch<SetStateAction<T>>] {
  const storage = options.storage ?? (typeof window !== 'undefined' ? window.localStorage : null)
  const serialize = options.serialize ?? defaultSerialize<T>
  const deserialize = options.deserialize ?? defaultDeserialize<T>

  const initializerRef = useRef(initializer)
  initializerRef.current = initializer

  const deserializeRef = useRef(deserialize)
  deserializeRef.current = deserialize

  const readStoredValue = useCallback(
    (targetKey: string | null): T => {
      const currentInitializer = initializerRef.current
      const currentDeserialize = deserializeRef.current

      if (!storage || targetKey === null) {
        return currentInitializer()
      }

      try {
        const rawValue = storage.getItem(targetKey)
        if (rawValue === null) {
          return currentInitializer()
        }

        return currentDeserialize(rawValue)
      } catch (error) {
        console.warn(`Failed to read persistent state for key "${targetKey}".`, error)
        return currentInitializer()
      }
    },
    [storage],
  )

  const [state, setState] = useState<T>(() => readStoredValue(key))
  const previousKeyRef = useRef<string | null>(key)

  useEffect(() => {
    if (previousKeyRef.current === key) {
      return
    }

    setState(readStoredValue(key))
    previousKeyRef.current = key
  }, [key, readStoredValue])

  useEffect(() => {
    if (!storage || key === null) {
      return
    }

    try {
      const serialized = serialize(state)
      storage.setItem(key, serialized)
    } catch (error) {
      console.warn(`Failed to persist state for key "${key}".`, error)
    }
  }, [key, serialize, state, storage])

  return [state, setState]
}
