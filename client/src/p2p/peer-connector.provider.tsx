import { createContext, PropsWithChildren, useContext, useEffect, useMemo } from 'react'
import { PeerConnector } from './peer.connector'
import { Signal } from './signal'
import { useSignal } from '@/p2p/signal.provider'
import { useAddress } from '@/p2p/keypair.provider'
import { useParams, useRouter } from 'next/navigation'

const PeerConnectorContext = createContext(new PeerConnector({
  address: '',
  signal: new Signal({ url: '', address: '', roomAddress: '' }),
  iceServers: [],
}))

export function usePeerConnector() {
  return useContext(PeerConnectorContext)
}

export interface PeerConnectorProviderProps extends PropsWithChildren {
  iceServers: RTCIceServer[]
}

export function PeerConnectorProvider(props: PeerConnectorProviderProps) {
  const { iceServers, children } = props
  const address = useAddress()
  const signal = useSignal()
  const peerConnector = useMemo(() => new PeerConnector({
    address,
    signal,
    iceServers,
  }), [address, signal, iceServers])

  useEffect(() => {
    peerConnector.setup()

    return () => {
      peerConnector.destroy()
    }
  }, [peerConnector])

  return (
    <PeerConnectorContext.Provider value={peerConnector}>
      {children}
    </PeerConnectorContext.Provider>
  )
}
