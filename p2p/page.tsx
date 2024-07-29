'use client'

import { useEffect, useRef, useState } from 'react'
import { PeerMessage, PeerNetwork, Room, Signaler, TextMessage, WebSocketSignaler } from '@/connection-logic'
import { Input, useField } from '../shared/Field'
import { Form } from '@/shared/Form'
import { Button } from '@/shared/Button'
import { ChatMessage } from '@/app/ChatMessage'
import * as net from 'net'

const SIGNALING_SERVER_URL = 'http://localhost:8080'

export default function HomePage() {
  const signalerRef = useRef<Signaler | null>(null)
  const networkRef = useRef<PeerNetwork | null>(null)
  const [clientId, setClientClientId] = useState<number | null>(null)
  const [room, setRoom] = useState<Room>()
  const roomId = useField<string>('')
  const [status, setStatus] = useState<'connecting' | 'connected'>('connected')
  const [messages, setMessages] = useState<Array<{ senderId: number, message: string }>>([])
  const message = useField<string>('')

  useEffect(() => {
    const signaler = new WebSocketSignaler(SIGNALING_SERVER_URL)
    const network = new PeerNetwork(signaler)
    signalerRef.current = signaler
    networkRef.current = network

    signaler.on('connected', signal => {
      network.senderId = signal.clientId
      setClientClientId(signal.clientId)
    })

    signaler.on('create-room-success', signal => {
      setRoom(signal.room)
    })

    signaler.on('join_room-success', signal => {
      setRoom(signal.room)
    })

    signaler.on('create-room-failure', signal => {
      alert('Failed to create a room')
    })

    signaler.on('join_room-failure', signal => {
      alert(`Failed to join a room #${signal.roomId}: ${signal.reason}`)
    })

    signaler.on('join_request', signal => {
      console.log('New peer joined', signal.peerId)
      network.connectTo(signal.peerId)
    })

    network.on('connected', peer => {
      console.log('Connected to peer', peer.id)
      setStatus('connected')
    })

    network.on('disconnected', peer => {
      console.log('Disconnected from peer', peer.id)
      setStatus('connecting')
    })

    network.on('message', ({ sender, message }) => {
      if (message.type === 'text') {
        addMessage(sender.id, message.data)
      }
    })
  }, [])

  const createRoom = () => {
    signalerRef.current?.send({
      type: 'create-room'
    })
  }

  const joinRoom = () => {
    if (parseInt(roomId.value)) {
      signalerRef.current?.send({
        type: 'join_room',
        roomId: Number(roomId.value),
      })
    }
  }

  const addMessage = (senderId: number, message: string) => {
    setMessages(messages => [
      ...messages,
      { senderId, message },
    ])
  }

  const broadcast = () => {
    if (clientId) {
      const textMessage: TextMessage = {
        type: 'text',
        data: message.value,
      }
      addMessage(clientId, message.value)
      networkRef.current?.broadcast(textMessage)
    }
  }

  return (
    <div>
      {!clientId && 'Connecting...'}
      {clientId && !room && (
        <div>
          <div>
            <button onClick={createRoom}>Create Room</button>
          </div>
          <div>
            <label>
              Room ID:
              <Input field={roomId}/>
            </label>
            <button onClick={joinRoom}>Join {roomId.value}</button>
          </div>
        </div>
      )}
      {clientId && status === 'connected' && room && (
        <div>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-4">
              {messages.map((message, index) => (
                <ChatMessage
                  key={index}
                  clientId={clientId}
                  message={message}
                />
              ))}
            </div>

            <div>
              <Form className="w-96 flex flex-col gap-6" onSubmit={broadcast}>
                <Input placeholder="Enter a message" field={message}/>
                <Button type="submit">Send</Button>
              </Form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
