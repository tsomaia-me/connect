import { createContext, PropsWithChildren, useContext, useEffect, useMemo } from 'react'
import { Signal } from '@/p2p/signal'
import { useAddress } from '@/p2p/keypair.provider'

const SignalContext = createContext(new Signal({ url: '', address: '' }))

export function useSignal() {
  return useContext(SignalContext)
}

export interface SignalProviderProps extends PropsWithChildren {
  url: string
}

export function SignalProvider(props: SignalProviderProps) {
  const { url, children } = props
  const address = useAddress()
  const signal = useMemo(() => new Signal({
    url,
    address,
  }), [url, address])

  useEffect(() => {
    signal.setup()

    return () => {
      signal.destroy()
    }
  }, [signal])

  return (
    <SignalContext.Provider value={signal}>
      {children}
    </SignalContext.Provider>
  )
}
