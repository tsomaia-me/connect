import { createContext, PropsWithChildren, useCallback, useContext } from 'react'

export interface FlexibleRequestInit extends Omit<RequestInit, 'body'> {
  body?: any
}

const FetchContext = createContext(fetch as (url: string, init?: FlexibleRequestInit) => Promise<Response>)

export interface FetchProviderProps extends PropsWithChildren {
  baseUrl: string
}

export function useFetch() {
  return useContext(FetchContext)
}

export function useFetchBody<T = unknown>() {
  const fetch = useFetch()

  return useCallback(async (url: string, init?: FlexibleRequestInit): Promise<T> => {
    const body = await fetch(url, init)

    return await body.json()
  }, [])
}

export function FetchProvider(props: FetchProviderProps) {
  const { baseUrl, children } = props
  const fetchFn = useCallback((url: string, init?: FlexibleRequestInit) => {
    return fetch(url.includes('://') ? url : `${baseUrl}${url}`, {
      mode: 'cors',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      ...init,
      body: typeof init?.body === 'object' ? JSON.stringify(init?.body) : init?.body ?? '',
    })
  }, [baseUrl])

  return (
    <FetchContext.Provider value={fetchFn}>
      {children}
    </FetchContext.Provider>
  )
}
