import { DependencyList, useCallback, useState } from 'react'

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
