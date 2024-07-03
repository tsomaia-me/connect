'use client'

import Connect from 'p2p/Connect'
import { SignalProvider } from './signal.provider'
import { PeerConnectorProvider } from './peer-connector.provider'
import { KeyPairProvider } from './keypair.provider'

const SIGNAL_URL = 'http://192.168.50.176:8080'
const ICE_SERVERS = [
  {
    urls: 'stun:stun.services.mozilla.com:3478',
  }
]

export default function ConnectContainer({ address }: { address?: string }) {
  return (
    <KeyPairProvider>
      <SignalProvider url={SIGNAL_URL}>
        <PeerConnectorProvider iceServers={ICE_SERVERS}>
          {address && <Connect address={address}/>}
        </PeerConnectorProvider>
      </SignalProvider>
    </KeyPairProvider>
  )
}
