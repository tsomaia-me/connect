'use client'

import { Signaler } from '@/components/Signaler'
import { PeerNetworkProvider } from '@/components/PeerNetworkProvider'
import { useCallback, useEffect, useState } from 'react'
import { Room, User } from '@/app.models'
import { useParams } from 'next/navigation'
import { Dashboard } from '@/components/dashboard'

const SIGNALING_SERVER_URL = 'http://localhost:8080'

export async function getUser(key: string) {
  const response = await fetch(`${SIGNALING_SERVER_URL}/user/${key}`, {
    headers: {
      'Content-Type': 'application/json',
    }
  })

  return await response.json()
}

export async function getRoom(key: string) {
  const response = await fetch(`${SIGNALING_SERVER_URL}/room/${key}`, {
    headers: {
      'Content-Type': 'application/json',
    }
  })

  return await response.json()
}

export default function RoomPage() {
  const params = useParams()
  const [user, setUser] = useState<User | null>(null)
  const [room, setRoom] = useState<Room | null>(null)
  const loadUser = useCallback(async () => {
    const [user, room] = await Promise.all([
      getUser(params.userKey?.toString() ?? ''),
      getRoom(params.roomKey?.toString() ?? ''),
    ])

    setUser(user)
    setRoom(room)
  }, [params])

  useEffect(() => {
    if (params?.userKey) {
      void loadUser()
    }
  }, [params, loadUser])

  return (
    <Signaler signalingServerUrl={SIGNALING_SERVER_URL}>
      {(user && room) && (
        <PeerNetworkProvider user={user} room={room}>
          <Dashboard/>
        </PeerNetworkProvider>
      )}
    </Signaler>
  )
}

// import { useEffect, useRef, useState } from 'react'
// import { PeerNetwork, Room, Signaler, TextMessage, WebSocketSignaler } from '@/connection-logic'
// import { Input, useField } from '../shared/Field'
// import { Form } from '@/shared/Form'
// import { Button } from '@/shared/Button'
// import { ChatMessage } from '@/app/ChatMessage'
// import { useParams } from 'next/navigation'
//
// const SIGNALING_SERVER_URL = 'http://localhost:8080'
//
// export default function HomePage() {
//   const roomId = useParams<{ roomId: string }>()
//   const signalerRef = useRef<Signaler | null>(null)
//   const networkRef = useRef<PeerNetwork | null>(null)
//   const [clientId, setClientClientId] = useState<number | null>(null)
//   const [room, setRoom] = useState<Room>()
//   const [status, setStatus] = useState<'connecting' | 'connected'>('connected')
//   const [messages, setMessages] = useState<Array<{ senderId: number, message: string }>>([])
//   const message = useField<string>('')
//
//   useEffect(() => {
//     const signaler = new WebSocketSignaler(SIGNALING_SERVER_URL)
//     const network = new PeerNetwork(signaler)
//     signalerRef.current = signaler
//     networkRef.current = network
//
//     signaler.on('connected', signal => {
//       network.senderId = signal.clientId
//       setClientClientId(signal.clientId)
//     })
//
//     signaler.on('create-room-success', signal => {
//       setRoom(signal.room)
//     })
//
//     signaler.on('join_room-success', signal => {
//       setRoom(signal.room)
//     })
//
//     signaler.on('create-room-failure', signal => {
//       alert('Failed to create a room')
//     })
//
//     signaler.on('join_room-failure', signal => {
//       alert(`Failed to join a room #${signal.roomId}: ${signal.reason}`)
//     })
//
//     signaler.on('join_request', signal => {
//       console.log('New peer joined', signal.peerId)
//       network.connectTo(signal.peerId)
//     })
//
//     network.on('connected', peer => {
//       console.log('Connected to peer', peer.id)
//       setStatus('connected')
//     })
//
//     network.on('disconnected', peer => {
//       console.log('Disconnected from peer', peer.id)
//       setStatus('connecting')
//     })
//
//     network.on('message', ({ sender, message }) => {
//       if (message.type === 'text') {
//         addMessage(sender.id, message.data)
//       }
//     })
//   }, [])
//
//   const createRoom = () => {
//     signalerRef.current?.send({
//       type: 'create-room'
//     })
//   }
//
//   const joinRoom = () => {
//     if (parseInt(roomId.value)) {
//       signalerRef.current?.send({
//         type: 'join_room',
//         roomId: Number(roomId.value),
//       })
//     }
//   }
//
//   const addMessage = (senderId: number, message: string) => {
//     setMessages(messages => [
//       ...messages,
//       { senderId, message },
//     ])
//   }
//
//   const broadcast = () => {
//     if (clientId) {
//       const textMessage: TextMessage = {
//         type: 'text',
//         data: message.value,
//       }
//       addMessage(clientId, message.value)
//       networkRef.current?.broadcast(textMessage)
//     }
//   }
//
//   return (
//     <div>
//       {!clientId && 'Connecting...'}
//       {clientId && !room && (
//         <div>
//           <div>
//             <button onClick={createRoom}>Create Room</button>
//           </div>
//           <div>
//             <label>
//               Room ID:
//               <Input field={roomId}/>
//             </label>
//             <button onClick={joinRoom}>Join {roomId.value}</button>
//           </div>
//         </div>
//       )}
//       {clientId && status === 'connected' && room && (
//         <div>
//           <div className="flex flex-col gap-4">
//             <div className="flex flex-col gap-4">
//               {messages.map((message, index) => (
//                 <ChatMessage
//                   key={index}
//                   clientId={clientId}
//                   message={message}
//                 />
//               ))}
//             </div>
//
//             <div>
//               <Form className="w-96 flex flex-col gap-6" onSubmit={broadcast}>
//                 <Input placeholder="Enter a message" field={message}/>
//                 <Button type="submit">Send</Button>
//               </Form>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   )
// }
