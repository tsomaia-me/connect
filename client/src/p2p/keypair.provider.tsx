import { createContext, PropsWithChildren, useContext, useMemo } from 'react'
import { ec as EC } from 'elliptic'
import { KeyPair } from './types'

const KeyPairContext = createContext<KeyPair>({
  key: '',
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
    const address = keyPair.getPublic('hex')

    return {
      key,
      address,
    }
  }, [])

  return (
    <KeyPairContext.Provider value={keyPair}>
      {children}
    </KeyPairContext.Provider>
  )
}
