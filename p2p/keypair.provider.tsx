import { createContext, PropsWithChildren, useContext, useMemo } from 'react'
import { ec as EC } from 'elliptic'
import { KeyPair } from './types'
import { sha256 } from 'js-sha256'

const KeyPairContext = createContext<KeyPair>({
  key: '',
  publicKey: '',
  address: '',
})

export function useKeyPair() {
  return useContext(KeyPairContext)
}

export function useKey() {
  return useKeyPair().key
}

export function useAddress() {
  return useKeyPair().address
}

export function KeyPairProvider(props: PropsWithChildren) {
  const { children } = props
  const keyPair = useMemo(() => {
    const ec = new EC('secp256k1')
    const keyPair = ec.genKeyPair()
    const key = keyPair.getPrivate('hex')
    const publicKey = keyPair.getPublic('hex')
    const address = sha256(publicKey)

    return {
      key,
      publicKey,
      address,
    }
  }, [])

  return (
    <KeyPairContext.Provider value={keyPair}>
      {children}
    </KeyPairContext.Provider>
  )
}
