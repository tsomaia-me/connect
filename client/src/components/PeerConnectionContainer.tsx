import { Room, User } from '@/app.models'
import { Dashboard } from '@/components/Dashboard'
import { useEffect, useRef, useState } from 'react'
import { useEmitter } from '@/shared/hooks'
import { useSocket } from '@/components/SocketProvider'
import { Peer, PeersMap, PeersRecord } from '@/app.types'

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

  useEffect(() => {
    if (room.participants.length < 2) {
      return
    }

    const selfIndex = room.participants.map((participant) => participant.user.id).indexOf(user.id)

    if (selfIndex % 2 === 0) {
      console.log(`even parity ${selfIndex}, initiating offer`)
      room.participants.forEach(participant => {
        if (participant.user.id === user.id || peersRef.current[participant.user.id]) {
          return
        }

        const peerConnection = new RTCPeerConnection({
          iceServers: ICE_SERVERS,
        })
        const dataChannel = peerConnection.createDataChannel('default')
        const peer: Peer = {
          connection: peerConnection,
          dataChannel,
        };
        peersRef.current[participant.user.id] = peer
        setPeers(new Map(Object.entries({ ...peersRef.current })))
        peerConnection.onicecandidate = (event) => {
          if (event.candidate) {
            console.log('sending icecandidate')
            void emit('icecandidate', {
              senderId: user.id,
              receiverId: participant.user.id,
              payload: event.candidate,
            })
          }
        }
        peerConnection.onnegotiationneeded = async () => {
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
        dataChannel.onopen = () => {
          console.log('data channel opened')
        }
        dataChannel.onclose = () => {
          console.log('data channel closed')
        }
      })
    } else {
      console.log(`odd parity ${selfIndex}, waiting for offers`)
      socket.on('offer', async (offer, callback) => {
        console.log('received offer', offer)
        const peerConnection = new RTCPeerConnection({
          iceServers: ICE_SERVERS,
        })
        const peer: Peer = {
          connection: peerConnection,
          dataChannel: null,
        }
        peersRef.current[offer.senderId] = peer
        setPeers(new Map(Object.entries({ ...peersRef.current })))
        peerConnection.onicecandidate = (event) => {
          if (event.candidate) {
            void emit('icecandidate', {
              senderId: user.id,
              receiverId: offer.senderId,
              payload: event.candidate,
            })
          }
        }
        peerConnection.ondatachannel = (event) => {
          console.log('received data channel')
          peer.dataChannel = event.channel

          peer.dataChannel.onopen = () => {
            console.log('data channel opened')
          }
          peer.dataChannel.onclose = () => {
            console.log('data channel closed')
          }
        }

        console.log('accepting offer', offer.payload)
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
  }, [user, room, socket, emit])

  return (
    <Dashboard
      userKey={userKey}
      roomKey={roomKey}
      user={user}
      room={room}
      peers={peers}
    />
  )
}
