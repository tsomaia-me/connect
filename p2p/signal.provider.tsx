import { createContext, PropsWithChildren, useContext, useEffect, useMemo } from 'react'
import { Signal } from 'p2p/signal'
import { useAddress } from 'p2p/keypair.provider'
import { useParams, useRouter } from 'next/navigation'

const SignalContext = createContext(
  new Signal({
    url: '',
    address: '',
    roomAddress: '',
  })
)

export function useSignal() {
  return useContext(SignalContext)
}

export interface SignalProviderProps extends PropsWithChildren {
  url: string
}

export function SignalProvider(props: SignalProviderProps) {
  const { url, children } = props
  const router  = useRouter()
  const { address: roomAddress }  = useParams()
  const ownAddress = useAddress()
  const signal = useMemo(() => new Signal({
    url,
    address: ownAddress,
    roomAddress: roomAddress?.toString() ?? ownAddress,
  }), [url, ownAddress, roomAddress])

  useEffect(() => {
    if (!roomAddress) {
      router.replace(`/room/${ownAddress}`)
      return
    }

    signal.setup()

    return () => {
      signal.destroy()
    }
  }, [signal, ownAddress, roomAddress])

  return (
    <SignalContext.Provider value={signal}>
      {children}
    </SignalContext.Provider>
  )
}
