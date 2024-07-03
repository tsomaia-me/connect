'use client'

import { Input, useField } from 'client/src/shared/Field'
import { Button } from 'client/src/shared/Button'
import { Form } from 'client/src/shared/Form'
import { Peer } from './peer'
import { FormEvent, useCallback, useEffect, useState } from 'react'
import { useSignal } from './signal.provider'
import { usePeerConnector } from './peer-connector.provider'
import { useKeyPair } from './keypair.provider'
import { PeerMessageEvent } from './types'
import { ChatMessage } from 'client/src/app/ChatMessage'

export default function Connect({ address }: { address: string }) {
  const { address: ownAddress } = useKeyPair()

  // const myAddress = useField(address)
  // const {
  //   signal,
  //   isChannelReady,
  //   peer,
  //   message,
  //   messages,
  //   connect,
  //   disconnect,
  //   sendMessage
  // } = usePeerEffect({ address })

  return (
    <div className="flex flex-row justify-center items-center h-full dark:bg-gray-900">
      <div>
        <div className="mt-16 w-96 flex flex-col gap-6">
          {/*{isChannelReady && (*/}
          {/*  <div className="flex flex-col gap-4">*/}
          {/*    <div className="flex flex-col gap-4">*/}
          {/*      {messages.map((message, index) => (*/}
          {/*        <ChatMessage*/}
          {/*          key={index}*/}
          {/*          address={address}*/}
          {/*          message={message}*/}
          {/*        />*/}
          {/*      ))}*/}
          {/*    </div>*/}

          {/*    <div>*/}
          {/*      <Form className="w-96 flex flex-col gap-6" onSubmit={sendMessage}>*/}
          {/*        <Input placeholder="Enter a message" field={message}/>*/}
          {/*        <Button type="submit">Send</Button>*/}
          {/*      </Form>*/}
          {/*    </div>*/}
          {/*  </div>*/}
          {/*)}*/}

          {/*<Button type="button" variant="danger" onClick={disconnect}>Disconnect</Button>*/}
        </div>
      </div>
    </div>
  )
}

// function usePeerEffect({ address }: { address?: string }) {
//   const signal = useSignal()
//   const peerConnector = usePeerConnector()
//   const [peer, setPeer] = useState<Peer | null>(null)
//   const peerAddress = useField<string>('')
//   const [messages, setMessages] = useState<PeerMessageEvent[]>([])
//   const [isChannelReady, setIsChannelReady] = useState(false)
//   const message = useField<string>('')
//
//   const connect = useCallback(async (event?: FormEvent) => {
//     event?.preventDefault()
//     await peerConnector.connect(peerAddress.value)
//   }, [peerConnector, peerAddress.value])
//
//   const disconnect = useCallback(() => {
//     peerConnector.disconnect(peerAddress.value)
//   }, [peerConnector, peerAddress.value])
//
//   const sendMessage = useCallback((event: FormEvent) => {
//     event.preventDefault()
//     peerConnector.sendMessage(peerAddress.value, message.value)
//     setMessages(messages => [
//       ...messages,
//       {
//         sender: address,
//         recipient: peerAddress.value,
//         data: message.value,
//       }
//     ])
//   }, [peerConnector, address, peerAddress.value, message.value])
//
//   useEffect(() => {
//     if (!address) {
//       return
//     }
//
//     peerConnector.on('connected', message => {
//       setPeer(message.peer)
//       console.log('peer connected')
//       peerAddress.onChange(message.address)
//     })
//
//     peerConnector.on('connection-state-changed', message => {
//       console.log('peer', message.data.connectionState)
//     })
//
//     peerConnector.on('channel-opened', () => {
//       console.log('channel ready')
//       setIsChannelReady(true)
//     })
//
//     peerConnector.on('channel-message', message => {
//       console.log('message received', message.data)
//       setMessages(messages => [
//         ...messages,
//         message,
//       ])
//     })
//
//     peerConnector.on('channel-closed', () => {
//       console.log('channel closed')
//       setIsChannelReady(false)
//     })
//
//     peerConnector.on('closed', () => {
//       console.log('peer disconnected')
//       setPeer(null)
//     })
//
//     return () => {
//       peerConnector.destroy()
//       signal.destroy()
//     }
//   }, [address, peerAddress.onChange, signal, peerConnector])
//
//   return {
//     signal,
//     isChannelReady,
//     peer,
//     message,
//     messages,
//     connect,
//     disconnect,
//     sendMessage,
//   }
// }
