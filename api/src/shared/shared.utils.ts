import { createHash } from 'crypto'
import { ec as EC } from 'elliptic'

const ec = new EC('secp256k1')

export function sha256(data: string) {
  return createHash('sha256')
    .update(data)
    .digest('hex')
}

export function verifySignature(input: string, signature: string, publicKey: string) {
  const keyPair = ec.keyFromPublic(publicKey, 'hex')

  return ec.verify(input, signature, keyPair)
}
