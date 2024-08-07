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
  const socketRef = useRef(socket)
  const sendSignalRef = useRef(sendSignal)
  const peerConnectionId = peer.connectionId

  // let's make sure ref(s) stay in sync with updated props
  socketRef.current = socket
  sendSignalRef.current = sendSignal
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
        sendSignalRef.current('icecandidate', {
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

    socketRef.current.on('offer', onOfferSignal)

    socketRef.current.on('answer', onAnswerSignal)

    socketRef.current.on('icecandidate', onIceCandidateSignal)

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
        console.log(`[${peerUsernameRef.current}][PeerContainer][sendOffer][before] create offer`)
        const offer = await connection.createOffer()
        console.log(`[${peerUsernameRef.current}][PeerContainer][sendOffer][after] create offer`, offer)
        console.log(`[${peerUsernameRef.current}][PeerContainer][sendOffer][before] set local description`, offer)
        await connection.setLocalDescription(offer)
        console.log(`[${peerUsernameRef.current}][PeerContainer][sendOffer][after] set local description`, offer)
        sendSignalRef.current('offer', {
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
        console.log(`[${peerUsernameRef.current}][PeerContainer][receiveOffer][before] set remote description`, offer)
        await connection.setRemoteDescription(offer)
        console.log(`[${peerUsernameRef.current}][PeerContainer][receiveOffer][after] set remote description`, offer)
        logMessage('An offer received')
      } catch (error) {
        logError('Failed to receive an answer', error)
      }
    }

    async function sendAnswer() {
      try {
        console.log(`[${peerUsernameRef.current}][PeerContainer][sendAnswer][before] create answer`)
        const answer = await connection.createAnswer()
        console.log(`[${peerUsernameRef.current}][PeerContainer][sendAnswer][after] create answer`, answer)
        await connection.setLocalDescription(answer)
        await addBufferedIceCandidates()
        sendSignalRef.current('answer', {
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
        console.log(`[${peerUsernameRef.current}][PeerContainer][receiveAnswer][before] set remote description`)
        await connection.setRemoteDescription(answer)
        console.log(`[${peerUsernameRef.current}][PeerContainer][receiveAnswer][before] set remove description`, answer)
        await addBufferedIceCandidates()
        logMessage('An answer received')
      } catch (error) {
        logError('Failed to receive an answer', error)
      }
    }

    async function addIceCandidate(candidate: RTCIceCandidate) {
      try {
        if (connection.localDescription && connection.remoteDescription) {
          logMessage('Adding ICE candidate', candidate)
          console.log(`[${peerUsernameRef.current}][PeerContainer][addIceCandidate][before] add ICE candidate`, candidate)
          await connection.addIceCandidate(candidate)
          console.log(`[${peerUsernameRef.current}][PeerContainer][addIceCandidate][after] add ICE candidate`)
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
          console.log(`[${peerUsernameRef.current}][PeerContainer][onnegotiationneeded][before] negotiation needed`)
          void sendOffer()
        }
      })
    } else {
      logMessage('Waiting for offer')
    }

    return () => {
      socketRef.current.off('offer', onOfferSignal)
      socketRef.current.off('answer', onAnswerSignal)
      socketRef.current.off('icecandidate', onIceCandidateSignal)

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
