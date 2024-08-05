import { Participant } from '@/app.models'
import { useEffect, useRef } from 'react'
import { useSignalerSender } from '@/components/shared/hooks'
import { Peer, useWebRTCContext } from '@/components/WebRTCProvider'
import { useSignaler } from '@/components/SocketProvider'

export interface PeerContainerProps {
  self: Participant
  participant: Participant
  isInitiator: boolean
}

export function PeerContainer(props: PeerContainerProps) {
  const { self, participant, isInitiator } = props
  const socket = useSignaler()
  const sendSignal = useSignalerSender()
  const { iceServers, addPeer, removePeer } = useWebRTCContext()
  const peerRef = useRef<Peer>({
    connectionId: participant.connectionId,
    participant,
    isInitiator,
    connection: {} as unknown as RTCPeerConnection, // placeholder, to avoid excessive type-checks
    dataChannel: {} as unknown as RTCDataChannel, // same
  })
  const iceServersRef = useRef<RTCIceServer[]>(iceServers)

  // let's make sure props stay in sync with updates props
  peerRef.current.connectionId = participant.connectionId
  peerRef.current.participant = participant
  peerRef.current.isInitiator = isInitiator
  iceServersRef.current = iceServers

  useEffect(() => {
    logMessage('useEffect() being called')

    const connection = new RTCPeerConnection({ iceServers: iceServersRef.current })
    const dataChannel = connection.createDataChannel('default', {
      negotiated: true,
      id: 0,
    })
    let iceCandidatesBuffer: RTCIceCandidate[] = []

    peerRef.current.connection = connection
    peerRef.current.dataChannel = dataChannel

    addPeer({ ...peerRef.current })

    connection.onicecandidate = (event) => {
      if (event.candidate) {
        logMessage('Sending ICE candidate', event.candidate)
        sendSignal('icecandidate', {
          senderId: self.connectionId,
          receiverId: participant.connectionId,
          payload: event.candidate,
        })
      }
    }

    connection.oniceconnectionstatechange = () => {
      const isClosed = connection.iceConnectionState === 'disconnected'
        || connection.iceConnectionState === 'failed'
        || connection.iceConnectionState === 'closed'

      if (isClosed) {
        logMessage(`ICE connection state changed to: ${connection.iceConnectionState}, closing`)
        connection.close()
        removePeer(participant.connectionId)
      }
    }

    dataChannel.onopen = () => {
      logMessage('Data channel opened')
    }

    dataChannel.onclose = () => {
      logMessage('Data channel closed')
    }

    socket.on('offer', onOfferSignal)

    socket.on('answer', onAnswer)
    
    socket.on('icecandidate', onIceCandidateSignal)

    function onOfferSignal(event) {
      void sendAnswer(event.payload)
    }

    function onAnswer(event) {
      void receiveAnswer(event.payload)
    }

    function onIceCandidateSignal(event) {
      void addIceCandidate(event.payload)
    }

    async function addBufferedIceCandidates() {
      if (iceCandidatesBuffer.length > 0) {
        console.log(`Adding ${iceCandidatesBuffer.length} buffered ICE candidates`)
        for (const iceCandidate of iceCandidatesBuffer) {
          await addIceCandidate(iceCandidate)
        }

        iceCandidatesBuffer = [];
      }
    }

    async function sendOffer() {
      try {
        const offer = await connection.createOffer()
        await connection.setLocalDescription(offer)
        sendSignal('offer', {
          senderId: self.connectionId,
          receiverId: participant.connectionId,
          payload: offer,
        })
        logMessage('An offer sent')
      } catch (error) {
        logError('Failed to send an offer', error)
      }
    }

    async function sendAnswer(offer) {
      try {
        await connection.setRemoteDescription(offer)
        const answer = await connection.createAnswer()
        await connection.setLocalDescription(answer)
        sendSignal('answer', {
          senderId: self.connectionId,
          receiverId: participant.connectionId,
          payload: answer,
        })
        await addBufferedIceCandidates()
        logMessage('An answer sent')
      } catch (error) {
        logError('Failed to send an answer', error)
      }
    }

    async function receiveAnswer(answer) {
      try {
        await connection.setRemoteDescription(answer)
        await addBufferedIceCandidates()
        logMessage('An answer received')
      } catch (error) {
        logError('Failed to receive an answer', error)
      }
    }

    async function addIceCandidate(candidate) {
      try {
        if (connection.remoteDescription) {
          logMessage('Adding ICE candidate', candidate)
          await connection.addIceCandidate(candidate)
        } else {
          logMessage('Buffering ICE candidate', candidate)
          iceCandidatesBuffer.push(candidate)
        }
      } catch (error) {
        logError('Failed to add ICE candidate', error)
      }
    }

    function logMessage(message: string, ...args: unknown[]) {
      console.log(
        `[PeerContainer][${peerRef.current.participant.user.username}] ${message}`,
        ...args
      )
    }

    function logError(message: string, ...args: unknown[]) {
      console.error(
        `[PeerContainer][${peerRef.current.participant.user.username}] ${message}`,
        ...args
      )
    }

    if (peerRef.current.isInitiator) {
      logMessage('Initiating offer')
      sendOffer().then(() => {
        connection.onnegotiationneeded = () => {
          logMessage('Negotiation needed')
          void sendOffer()
        }
      })
    } else {
      logMessage('Waiting for offer')
    }

    return () => {
      socket.off('offer', onOfferSignal)
      socket.off('answer', onAnswer)
      socket.off('icecandidate', onIceCandidateSignal)

      connection.onicecandidate = null
      connection.oniceconnectionstatechange = null
      connection.onnegotiationneeded = null
      dataChannel.onopen = null
      dataChannel.onclose = null
      dataChannel.close()
      connection.close()
    }
  }, [self, participant.connectionId, addPeer, removePeer])

  return null
}
