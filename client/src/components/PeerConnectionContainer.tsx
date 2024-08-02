import { Room, User } from '@/app.models'
import { Dashboard } from '@/components/Dashboard'
import { useEffect, useRef, useState } from 'react'
import { useEmitter } from '@/shared/hooks'
import { useSocket } from '@/components/SocketProvider'
import { Peer, PeersMap, PeersRecord } from '@/app.types'
import { RoomControlsProvider } from '@/components/RoomControlsProvider'

export interface RoomViewProps {
  userKey: string
  roomKey: string
  user: User
  room: Room
}

const ICE_SERVERS = [
  {
    urls: 'stun:stun.services.mozilla.com:3478',
  }
]

export function PeerConnectionContainer(props: RoomViewProps) {
  const { userKey, roomKey, user, room } = props
  const socket = useSocket()
  const emit = useEmitter()
  const peersRef = useRef<PeersRecord>({})
  const [peers, setPeers] = useState<PeersMap>(new Map())
  const userId = user.id

  useEffect(() => {
    if (room.participants.length < 2) {
      return
    }

    const selfIndex = room.participants.map((participant) => participant.user.id).indexOf(userId)

    room.participants.forEach(async participant => {
      if (participant.user.id === userId || (peersRef.current[participant.user.id]?.connection && peersRef.current[participant.user.id].connection.connectionState !== 'new')) {
        console.log('cancelling offer', {
          isSameUser: participant.user.id === userId,
          alreadyConnected: peersRef.current[participant.user.id],
          connectionState: peersRef.current[participant.user.id]?.connection.connectionState,
        })
        return
      }

      const peerConnection = new RTCPeerConnection({
        iceServers: ICE_SERVERS,
      })
      const dataChannel = peerConnection.createDataChannel('default', {
        negotiated: true,
        id: 0,
      })
      const peer: Peer = {
        participant: room.participants.find(p => p.user.id === participant.user.id)!,
        connection: peerConnection,
        dataChannel: dataChannel,
      }
      peersRef.current[participant.user.id] = peer
      setPeers(new Map(Object.entries({ ...peersRef.current })))

      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          void emit('icecandidate', {
            senderId: user.id,
            receiverId: participant.user.id,
            payload: event.candidate,
          })
        }
      }

      dataChannel.onopen = () => {
        console.log('data channel opened')
      }

      dataChannel.onclose = () => {
        console.log(`data channel closed, disconnecting the peer ${participant.user.username}`)
        delete peersRef.current[participant.user.id]
        setPeers(new Map(Object.entries({ ...peersRef.current })))
      }

      peerConnection.onconnectionstatechange = () => {
        console.log('connection state changed to', peerConnection.connectionState)
        if (peerConnection.connectionState === 'closed') {
          console.log(`peer ${participant.user.username} disconnected`)
          delete peersRef.current[participant.user.id]
          setPeers(new Map(Object.entries({ ...peersRef.current })))
        }
      }

      async function offer() {
        const offer = await peerConnection.createOffer()
        await peerConnection.setLocalDescription(offer)
        const answer = await emit('offer', {
          senderId: user.id,
          receiverId: participant.user.id,
          payload: offer,
        })
        console.log('received answer', answer.payload)
        await peerConnection.setRemoteDescription(answer.payload)
        socket.on(`icecandidate:${participant.user.id}`, async candidate => {
          console.log('received icecandidate', candidate.payload, 'with answer', answer.payload)
          await peerConnection.addIceCandidate(candidate.payload)
        })
      }

      if (selfIndex % 2 === 0) {
        console.log(`even parity ${selfIndex}, initiating offer`)
        console.log('making initial offer')
        await offer()

        peerConnection.onnegotiationneeded = async () => {
          console.log('starting negotiation')
          await offer()
        }
      } else {
        console.log(`odd parity ${selfIndex}, waiting for offers`)
        socket.on('offer', async (offer, callback) => {
          console.log('received offer', offer)

          await peerConnection.setRemoteDescription(offer.payload)
          const answer = await peerConnection.createAnswer()
          await peerConnection.setLocalDescription(answer)
          console.log('answering', answer)
          await callback({
            senderId: user.id,
            receiverId: offer.senderId,
            payload: answer,
          })

          socket.on(`icecandidate:${offer.senderId}`, async candidate => {
            console.log('received icecandidate', candidate.payload, 'with offer', offer.payload)
            await peerConnection.addIceCandidate(candidate.payload)
          })
        })
      }
    })
  }, [userId, room, socket, emit])

  return (
    <RoomControlsProvider
      userKey={userKey}
      roomKey={roomKey}
      user={user}
      room={room}
      peers={peers}
    >
      <Dashboard/>
    </RoomControlsProvider>
  )
}
