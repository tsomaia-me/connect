import { Room, User } from '@/app.models'
import { Dashboard } from '@/components/Dashboard'
import { useEffect, useRef, useState } from 'react'
import { useSignalerSender } from '@/components/shared/hooks'
import { useSignaler } from '@/components/SocketProvider'
import { Peer, PeersMap, PeersRecord } from '@/app.types'
import { RoomControlsProvider } from '@/components/RoomControlsProvider'
import { PeerContainer } from '@/components/PeerContainer'

export interface RoomViewProps {
  userKey: string
  roomKey: string
  user: User
  room: Room
}

export function PeerConnectionContainer(props: RoomViewProps) {
  const { userKey, roomKey, user, room } = props
  const socket = useSignaler()
  const emit = useSignalerSender()
  const peersRef = useRef<PeersRecord>({})
  const [peers, setPeers] = useState<PeersMap>(new Map())
  const userId = user.id

  useEffect(() => {
    if (room.participants.length < 2) {
      return
    }

    const selfIndex = room.participants.map((participant) => participant.user.id).indexOf(userId)

    if (peersRef.current) {
      for (const peerId of Object.keys(peersRef.current)) {
        const peer = peersRef.current[peerId]
        const participant = room.participants.find(p => p.user.id === peerId)

        if (!participant || participant.connectionId !== peer.participant.connectionId) {
          if (peer.connection.connectionState !== 'closed') {
            peer.dataChannel.close()
            peer.connection.close()
          }

          delete peersRef.current[peerId]
        }
      }
    }

    setPeers(new Map(Object.entries({ ...peersRef.current })))

    room.participants.forEach(async participant => {
      const existingParticipant = peersRef.current[participant.user.id]?.participant

      if (participant.user.id === userId || (existingParticipant && existingParticipant.connectionId === participant.connectionId)) {
        console.log('cancelling offer', {
          isSameUser: participant.user.id === userId,
          alreadyConnected: peersRef.current[participant.user.id],
          connectionState: peersRef.current[participant.user.id]?.connection.connectionState,
          dataChannel: peersRef.current[participant.user.id]?.dataChannel?.readyState,
        })
        return
      }

      console.log('created RTCPeerConnection')
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
        iceCandidatesBuffer: [],
      }

      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          emit('icecandidate', {
            senderId: user.id,
            receiverId: participant.user.id,
            payload: event.candidate,
          })
        }
      }

      dataChannel.onopen = () => {
        peersRef.current[participant.user.id] = peer
        setPeers(new Map(Object.entries({ ...peersRef.current })))
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

        emit('offer', {
          senderId: user.id,
          receiverId: participant.user.id,
          payload: offer,
        })
      }

      socket.on('icecandidate', async candidate => {
        console.log('received icecandidate', candidate.payload)
        if (peerConnection.remoteDescription) {
          console.log('adding icecandidate', candidate.payload)
          await peerConnection.addIceCandidate(candidate.payload)
        } else {
          console.log('buffering icecandidate because remote description is not set yet', candidate.payload)
          peer.iceCandidatesBuffer.push(candidate.payload)
        }
      })

      if (selfIndex % 2 === 0) {
        console.log(`even parity ${selfIndex}, initiating offer`)
        console.log('making initial offer')

        socket.on('answer', async answer => {
          console.log('received answer', answer.payload)
          if (peerConnection.signalingState !== 'stable') {
            await peerConnection.setRemoteDescription(answer.payload)

            if (peer.iceCandidatesBuffer.length > 0) {
              console.log(`${peer.iceCandidatesBuffer.length} Buffered ICE candidates available, adding`)
              peer.iceCandidatesBuffer.forEach(candidate => {
                peer.connection.addIceCandidate(candidate)
              })
              peer.iceCandidatesBuffer = [];
            }
            console.log('remote description set')
          } else {
            console.log('ignoring setting remote description because peer connection is in stable state')
          }
        })

        await offer()

        peerConnection.onnegotiationneeded = async () => {
          console.log('starting negotiation')
          await offer()
        }
      } else {
        console.log(`odd parity ${selfIndex}, waiting for offers`)
        socket.on('offer', async offer => {
          console.log('received offer', offer)

          await peerConnection.setRemoteDescription(offer.payload)
          const answer = await peerConnection.createAnswer()
          await peerConnection.setLocalDescription(answer)
          console.log('answering', answer)
          emit('answer', {
            senderId: user.id,
            receiverId: offer.senderId,
            payload: answer,
          })
          console.log('answered', answer)

          if (peer.iceCandidatesBuffer.length > 0) {
            console.log(`${peer.iceCandidatesBuffer.length} Buffered ICE candidates available, adding`)
            peer.iceCandidatesBuffer.forEach(candidate => {
              peer.connection.addIceCandidate(candidate)
            })
            peer.iceCandidatesBuffer = [];
          }
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
