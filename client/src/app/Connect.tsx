'use client'

import { Input, useField } from '@/shared/Field'
import { Button } from '@/shared/Button'
import { Form } from '@/shared/Form'
import { Peer } from '@/p2p/peer'
import { FormEvent, useCallback, useEffect, useState } from 'react'
import { useSignal } from '@/p2p/signal.provider'
import { usePeerConnector } from '@/p2p/peer-connector.provider'
import { useKeyPair } from '@/p2p/keypair.provider'
import { PeerMessageEvent } from '@/p2p/types'
import classNames from 'classnames'
import { ChatMessage } from '@/app/ChatMessage'

export default function Connect() {
  const { address } = useKeyPair()
  const signal = useSignal()
  const peerConnector = usePeerConnector()
  const myAddress = useField(address)
  const peerAddress = useField<string>('')
  const message = useField<string>('')
  const [peer, setPeer] = useState<Peer | null>(null)
  const [messages, setMessages] = useState<PeerMessageEvent[]>([])
  const [isChannelReady, setIsChannelReady] = useState(false)

  const onConnect = useCallback(async (event: FormEvent) => {
    event.preventDefault()
    await peerConnector.connect(peerAddress.value)
  }, [peerConnector, peerAddress.value])

  const onDisconnect = useCallback(() => {
    peerConnector.disconnect(peerAddress.value)
  }, [peerConnector, peerAddress.value])

  const onSendMessage = useCallback((event: FormEvent) => {
    event.preventDefault()
    peerConnector.sendMessage(peerAddress.value, message.value)
    setMessages(messages => [
      ...messages,
      {
        sender: address,
        recipient: peerAddress.value,
        data: message.value,
      }
    ])
  }, [peerConnector, address, peerAddress.value, message.value])

  useEffect(() => {
    if (!address) {
      return
    }

    peerConnector.on('connected', message => {
      setPeer(message.peer)
      console.log('peer connected')
      peerAddress.onChange(message.address)
    })

    peerConnector.on('connection-state-changed', message => {
      console.log('peer', message.data.connectionState)
    })

    peerConnector.on('channel-opened', () => {
      console.log('channel ready')
      setIsChannelReady(true)
    })

    peerConnector.on('channel-message', message => {
      console.log('message received', message.data)
      setMessages(messages => [
        ...messages,
        message,
      ])
    })

    peerConnector.on('channel-closed', () => {
      console.log('channel closed')
      setIsChannelReady(false)
    })

    peerConnector.on('closed', () => {
      console.log('peer disconnected')
      setPeer(null)
    })

    return () => {
      peerConnector.destroy()
      signal.destroy()
    }
  }, [address, peerAddress.onChange, signal, peerConnector])

  return (
    <div>
      {!peer && (
        <Form className="w-96 flex flex-col gap-6" onSubmit={onConnect}>
          <Input placeholder="My Address" field={myAddress} readOnly={true}/>
          <Input placeholder="Peer Address" field={peerAddress}/>
          <Button type="submit">Connect</Button>
        </Form>
      )}

      {peer && (
        <div className="mt-16 w-96 flex flex-col gap-6">
          {isChannelReady && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-4">
                {messages.map((message, index) => (
                  <ChatMessage
                    key={index}
                    address={address}
                    message={message}
                  />
                ))}
              </div>

              <div>
                <Form className="w-96 flex flex-col gap-6" onSubmit={onSendMessage}>
                  <Input placeholder="Enter a message" field={message}/>
                  <Button type="submit">Send</Button>
                </Form>
              </div>
            </div>
          )}

          <Button type="button" variant="danger" onClick={onDisconnect}>Disconnect</Button>
        </div>
      )}
    </div>
  )
}
