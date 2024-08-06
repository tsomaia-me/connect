import { OfferSignal, Participant, SignalEvent } from '@/app.models'
import { useEffect, useRef } from 'react'
import { useSignalSender } from '@/components/shared/hooks'
import { Peer, PeerEvent, useWebRTCContext } from '@/components/WebRTCProvider'
import { useSignaler } from '@/components/SocketProvider'

export interface PeerContainerProps {
  self: Participant
  peer: Peer
}

export function PeerContainer(props: PeerContainerProps) {
  const { self, peer } = props
  const socket = useSignaler()
  const sendSignal = useSignalSender()
  const { iceServers, updatePeer, removePeer } = useWebRTCContext()
  const iceServersRef = useRef<RTCIceServer[]>(iceServers)
  const isInitiatorRef = useRef<boolean>(peer.isInitiator)
  const peerUsernameRef = useRef<string>(peer.participant.user.username)
  const peerConnectionId = peer.connectionId

  // let's make sure ref(s) stay in sync with updated props
  iceServersRef.current = iceServers
  isInitiatorRef.current = peer.isInitiator
  peerUsernameRef.current = peer.participant.user.username

  useEffect(() => {
    logMessage('useEffect() being called')

    const connection = new RTCPeerConnection({ iceServers: iceServersRef.current })
    const dataChannel = connection.createDataChannel('default', {
      negotiated: true,
      id: 0,
    })
    let iceCandidatesBuffer: RTCIceCandidate[] = []

    updatePeer(peerConnectionId, p => ({
      ...p,
      connection,
      dataChannel,
    }))

    connection.onicecandidate = (event: RTCPeerConnectionIceEvent) => {
      if (event.candidate) {
        logMessage('Sending ICE candidate', event.candidate)
        sendSignal('icecandidate', {
          senderId: self.connectionId,
          receiverId: peerConnectionId,
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
        closeConnection()
      }
    }

    dataChannel.onopen = () => {
      logMessage('Data channel opened')
    }

    dataChannel.onclose = () => {
      logMessage('Data channel closed')
      closeConnection()
    }

    socket.on('offer', onOfferSignal)

    socket.on('answer', onAnswerSignal)
    
    socket.on('icecandidate', onIceCandidateSignal)

    function onOfferSignal(event: SignalEvent<RTCSessionDescriptionInit>) {
      void receiveOffer(event.payload)
        .then(() => sendAnswer())
    }

    function onAnswerSignal(event: SignalEvent<RTCSessionDescriptionInit>) {
      void receiveAnswer(event.payload)
    }

    function onIceCandidateSignal(event: SignalEvent<RTCIceCandidate>) {
      void addIceCandidate(event.payload)
    }

    async function addBufferedIceCandidates() {
      if (iceCandidatesBuffer.length > 0) {
        logMessage(`Adding ${iceCandidatesBuffer.length} buffered ICE candidates`)
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
          receiverId: peerConnectionId,
          payload: offer,
        })
        logMessage('An offer sent')
      } catch (error) {
        logError('Failed to send an offer', error)
      }
    }

    async function receiveOffer(offer: RTCSessionDescriptionInit) {
      try {
        await connection.setRemoteDescription(offer)
        await addBufferedIceCandidates()
        logMessage('An offer received')
      } catch (error) {
        logError('Failed to receive an answer', error)
      }
    }

    async function sendAnswer() {
      try {
        const answer = await connection.createAnswer()
        await connection.setLocalDescription(answer)
        sendSignal('answer', {
          senderId: self.connectionId,
          receiverId: peerConnectionId,
          payload: answer,
        })
        logMessage('An answer sent')
      } catch (error) {
        logError('Failed to send an answer', error)
      }
    }

    async function receiveAnswer(answer: RTCSessionDescriptionInit) {
      try {
        await connection.setRemoteDescription(answer)
        await addBufferedIceCandidates()
        logMessage('An answer received')
      } catch (error) {
        logError('Failed to receive an answer', error)
      }
    }

    async function addIceCandidate(candidate: RTCIceCandidate) {
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

    function closeConnection() {
      connection.close()
      removePeer(peerConnectionId)
    }

    function logMessage(message: string, ...args: unknown[]) {
      console.log(
        `[PeerContainer][${peerUsernameRef.current}] ${message}`,
        ...args
      )
    }

    function logError(message: string, ...args: unknown[]) {
      console.error(
        `[PeerContainer][${peerUsernameRef.current}] ${message}`,
        ...args
      )
    }

    if (isInitiatorRef.current) {
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
      socket.off('answer', onAnswerSignal)
      socket.off('icecandidate', onIceCandidateSignal)

      connection.onicecandidate = null
      connection.oniceconnectionstatechange = null
      connection.onnegotiationneeded = null
      dataChannel.onopen = null
      dataChannel.onclose = null
      dataChannel.close()
      connection.close()
    }
  }, [self, peerConnectionId, updatePeer, removePeer])

  return null
}
