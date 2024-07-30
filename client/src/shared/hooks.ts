import { DependencyList, useCallback, useEffect, useState } from 'react'
import { FieldParams, SocketResponse } from '@/shared/types'
import { useSocket } from '@/components/SocketProvider'

export function useMutation<T extends Function>(callback: T, deps: DependencyList) {
  const [isExecuting, setIsExecuting] = useState(false)
  const [result, setResult] = useState(null)
  const execute = useCallback(async () => {
    setIsExecuting(true)
    setResult(null)
    const result = await callback()
    setResult(result)
    setIsExecuting(false)
  }, deps)

  return {
    isExecuting,
    result,
    execute,
  }
}

export function useField<T extends string | number | null>(initialValue: T): FieldParams<T> {
  const [value, setValue] = useState<T>(initialValue)

  useEffect(() => {
    setValue(initialValue)
  }, [initialValue])

  return {
    value,
    onChange: setValue,
  } as FieldParams<T>
}

export function useEmitter(): <T>(message: string, payload: unknown) => Promise<T> {
  const socket = useSocket()

  return useCallback(async <T>(message: string, payload: unknown): Promise<T> => {
    return new Promise<T>((resolve, reject) => {
      socket.emit(message, payload, (response: SocketResponse<T>) => {
        if (response.ok) {
          resolve(response.payload)
        } else {
          reject(response)
        }
      })
    })
  }, [socket])
}

export function useRealtimeData<T>(message: string, payload: unknown) {
  const emit = useEmitter()
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<unknown | null>(null)

  useEffect(() => {
    emit<T>(message, payload)
      .then(data => {
        setData(data)
        setError(null)
      })
      .catch(error => {
        setData(null)
        setError(error)
      })
  }, [message, payload, emit])

  return [data, error]
}
