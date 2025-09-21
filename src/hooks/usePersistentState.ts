import { Dispatch, SetStateAction, useCallback, useEffect, useRef, useState } from 'react'

type Serializer<T> = (value: T) => string
type Deserializer<T> = (value: string) => T

interface PersistentStateControls {
  clear: () => void
  hydrated: boolean
}

interface PersistentStateOptions<T> {
  storage?: Storage | null
  serialize?: Serializer<T>
  deserialize?: Deserializer<T>
}

function getDefaultStorage(): Storage | null {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    return window.localStorage
  } catch (error) {
    console.warn('Unable to access localStorage for persistent state.', error)
    return null
  }
}

export function usePersistentState<T>(
  key: string | null,
  initialValue: () => T,
  options: PersistentStateOptions<T> = {},
): [T, Dispatch<SetStateAction<T>>, PersistentStateControls] {
  const storage = options.storage ?? getDefaultStorage()
  const serialize: Serializer<T> = options.serialize ?? ((value) => JSON.stringify(value))
  const deserialize: Deserializer<T> =
    options.deserialize ?? ((value) => JSON.parse(value) as T)

  const keyRef = useRef<string | null>(key)

  const readStoredValue = useCallback((): T => {
    if (!storage || key == null) {
      return initialValue()
    }

    try {
      const stored = storage.getItem(key)
      if (stored == null) {
        return initialValue()
      }

      return deserialize(stored)
    } catch (error) {
      console.warn('Unable to read persistent state, falling back to default value.', error)
      return initialValue()
    }
  }, [storage, key, deserialize, initialValue])

  const [value, setValue] = useState<T>(() => readStoredValue())
  const [hydrated, setHydrated] = useState<boolean>(() => key == null || storage == null)

  useEffect(() => {
    if (keyRef.current === key) {
      return
    }

    keyRef.current = key

    if (!storage || key == null) {
      setValue(initialValue())
      setHydrated(true)
      return
    }

    let cancelled = false
    setHydrated(false)

    Promise.resolve().then(() => {
      if (cancelled) {
        return
      }

      const nextValue = readStoredValue()
      setValue(nextValue)
      setHydrated(true)
    })

    return () => {
      cancelled = true
    }
  }, [key, storage, readStoredValue, initialValue])

  useEffect(() => {
    if (!storage || key == null) {
      return
    }

    try {
      const serialized = serialize(value)
      storage.setItem(key, serialized)
    } catch (error) {
      console.warn('Unable to persist state to storage.', error)
    }
  }, [key, storage, serialize, value])

  const clear = useCallback(() => {
    if (storage && key != null) {
      try {
        storage.removeItem(key)
      } catch (error) {
        console.warn('Unable to clear persistent state from storage.', error)
      }
    }

    setValue(initialValue())
    setHydrated(true)
  }, [storage, key, initialValue])

  return [value, setValue, { clear, hydrated }]
}
