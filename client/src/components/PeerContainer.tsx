import { OfferSignal, Participant, SignalEvent } from '@/app.models'
import { MutableRefObject, useEffect, useRef } from 'react';
import { useSignalSender } from '@/components/shared/hooks'
import { Peer, PeerEvent, useWebRTCContext } from '@/components/WebRTCProvider'
import { useSignaler } from '@/components/SocketProvider'

export interface PeerContainerProps {
  self: Participant
  peer: Peer
  connectionsRef: MutableRefObject<Map<string, RTCPeerConnection>>
  bufferedCandidatesRef: MutableRefObject<Map<string, RTCIceCandidate[]>>
}

export function PeerContainer(props: PeerContainerProps) {
  const { self, peer, connectionsRef, bufferedCandidatesRef } = props
  const socket = useSignaler()
  const sendSignal = useSignalSender()
  const { iceServers, updatePeer, removePeer } = useWebRTCContext()
  const iceServersRef = useRef<RTCIceServer[]>(iceServers)
  const isInitiatorRef = useRef<boolean>(peer.isInitiator)
  const peerUsernameRef = useRef<string>(peer.participant.user.username)
  const socketRef = useRef(socket)
  const sendSignalRef = useRef(sendSignal)
  const selfConnectionId= self.connectionId
  const peerConnectionId = peer.connectionId
  const selfConnectionIdRef = useRef<string>(selfConnectionId)
  const peerConnectionIdRef = useRef<string>(peerConnectionId)

  // let's make sure ref(s) stay in sync with updated props
  socketRef.current = socket
  sendSignalRef.current = sendSignal
  iceServersRef.current = iceServers
  isInitiatorRef.current = peer.isInitiator
  peerUsernameRef.current = peer.participant.user.username
  selfConnectionIdRef.current = selfConnectionId
  peerConnectionIdRef.current = peerConnectionId

  useEffect(() => {
    selfConnectionIdRef.current = selfConnectionId
    peerConnectionIdRef.current = peerConnectionId
  }, [selfConnectionId, peerConnectionId]);

  useEffect(() => {
    logMessage('useEffect() being called')

    const connection = new RTCPeerConnection({ iceServers: iceServersRef.current })
    const dataChannel = connection.createDataChannel('default', {
      negotiated: true,
      id: 0,
    })
    let iceCandidatesBuffer: RTCIceCandidate[] = []
    connectionsRef.current.set(peerConnectionIdRef.current, connection)
    let localUfrag: string | null = null
    let remoteUfrag: string | null = null

    updatePeer(peerConnectionIdRef.current, p => ({
      ...p,
      connection,
      dataChannel,
    }))

    connection.onicecandidate = (event: RTCPeerConnectionIceEvent) => {
      if (event.candidate) {
        logMessage('Sending ICE candidate', event.candidate)
        sendSignalRef.current('icecandidate', {
          senderId: selfConnectionIdRef.current,
          receiverId: peerConnectionIdRef.current,
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
      const buffer = bufferedCandidatesRef.current.get(peerConnectionIdRef.current) ?? []

      if (buffer.length > 0) {
        logMessage(`Adding ${buffer.length} buffered ICE candidates`)
        for (const iceCandidate of buffer) {
          await addIceCandidate(iceCandidate)
        }

        bufferedCandidatesRef.current.set(peerConnectionIdRef.current, [])
      }
    }

    async function sendOffer() {
      try {
        console.log(`[${peerUsernameRef.current}][${peerConnectionIdRef.current}][PeerContainer][sendOffer][before] create offer`)
        const offer = await connection.createOffer()

        console.log(`[${peerUsernameRef.current}][${peerConnectionIdRef.current}][PeerContainer][sendOffer][after] create offer`, offer)
        console.log(`[${peerUsernameRef.current}][${peerConnectionIdRef.current}][PeerContainer][sendOffer][before] set local description`, offer)
        await connection.setLocalDescription(offer)
        localUfrag = extractUfrag(offer.sdp)
        console.log(`[${peerUsernameRef.current}][${peerConnectionIdRef.current}][PeerContainer][sendOffer][after] set local description`, offer)
        sendSignalRef.current('offer', {
          senderId: selfConnectionIdRef.current,
          receiverId: peerConnectionIdRef.current,
          payload: offer,
        })
        logMessage('An offer sent')
      } catch (error) {
        logError('Failed to send an offer', error)
      }
    }

    async function receiveOffer(offer: RTCSessionDescriptionInit) {
      try {
        console.log(`[${peerUsernameRef.current}][${peerConnectionIdRef.current}][PeerContainer][receiveOffer][before] set remote description`, offer)
        await connection.setRemoteDescription(offer)
        remoteUfrag = extractUfrag(offer.sdp)
        console.log(`[${peerUsernameRef.current}][${peerConnectionIdRef.current}][PeerContainer][receiveOffer][after] set remote description`, offer)
        logMessage('An offer received')
      } catch (error) {
        logError('Failed to receive an answer', error)
      }
    }

    async function sendAnswer() {
      try {
        console.log(`[${peerUsernameRef.current}][${peerConnectionIdRef.current}][PeerContainer][sendAnswer][before] create answer`)
        const answer = await connection.createAnswer()
        console.log(`[${peerUsernameRef.current}][${peerConnectionIdRef.current}][PeerContainer][sendAnswer][after] create answer`, answer)
        console.log(`[${peerUsernameRef.current}][${peerConnectionIdRef.current}][PeerContainer][sendAnswer][before] set local description`, answer)
        await connection.setLocalDescription(answer)
        localUfrag = extractUfrag(answer.sdp)
        console.log(`[${peerUsernameRef.current}][${peerConnectionIdRef.current}][PeerContainer][sendAnswer][after] set local description`, answer)
        await addBufferedIceCandidates()
        sendSignalRef.current('answer', {
          senderId: selfConnectionIdRef.current,
          receiverId: peerConnectionIdRef.current,
          payload: answer,
        })
        logMessage('An answer sent')
      } catch (error) {
        logError('Failed to send an answer', error)
      }
    }

    async function receiveAnswer(answer: RTCSessionDescriptionInit) {
      if (connection.signalingState === 'stable') {
        return
      }

      try {
        console.log(`[${peerUsernameRef.current}][${peerConnectionIdRef.current}][PeerContainer][receiveAnswer][before] set remote description`)
        await connection.setRemoteDescription(answer)
        localUfrag = extractUfrag(answer.sdp)
        console.log(`[${peerUsernameRef.current}][${peerConnectionIdRef.current}][PeerContainer][receiveAnswer][before] set remove description`, answer)
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
          console.log(`[${peerUsernameRef.current}][${peerConnectionIdRef.current}][PeerContainer][addIceCandidate][before] add ICE candidate`, candidate)
          const candidateUfrag = extractCandidateUfrag(candidate.candidate)

          if (candidateUfrag === remoteUfrag) {
            await connection.addIceCandidate(candidate)
            console.log(`[${peerUsernameRef.current}][${peerConnectionIdRef.current}][PeerContainer][addIceCandidate][after] add ICE candidate`)
          } else {
            console.log(`[${peerUsernameRef.current}][${peerConnectionIdRef.current}][PeerContainer][addIceCandidate][after] failed to add ICE candidate, stale connection`)
          }
        } else {
          logMessage('Buffering ICE candidate', candidate)
          if (!bufferedCandidatesRef.current.has(peerConnectionIdRef.current)) {
            bufferedCandidatesRef.current.set(peerConnectionIdRef.current, [])
          }

          bufferedCandidatesRef.current.get(peerConnectionIdRef.current)!.push(candidate)
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
        `[PeerContainer][${peerUsernameRef.current}][${peerConnectionIdRef.current}] ${message}`,
        ...args
      )
    }

    function logError(message: string, ...args: unknown[]) {
      console.error(
        `[PeerContainer][${peerUsernameRef.current}][${peerConnectionIdRef.current}] ${message}`,
        ...args
      )
    }

    if (isInitiatorRef.current) {
      logMessage('Initiating offer')
      sendOffer().then(() => {
        connection.onnegotiationneeded = () => {
          logMessage('Negotiation needed')
          console.log(`[${peerUsernameRef.current}][${peerConnectionIdRef.current}][PeerContainer][onnegotiationneeded][before] negotiation needed`)
          void sendOffer()
        }
      })
    } else {
      logMessage('Waiting for offer')
    }

    const connections = connectionsRef.current

    return () => {
      updatePeer(peerConnectionIdRef.current, p => ({
        ...p,
        connection,
        dataChannel,
      }))

      socketRef.current.off('offer', onOfferSignal)
      socketRef.current.off('answer', onAnswerSignal)
      socketRef.current.off('icecandidate', onIceCandidateSignal)

      connection.onicecandidate = null
      connection.oniceconnectionstatechange = null
      connection.onnegotiationneeded = null
      dataChannel.onopen = null
      dataChannel.onclose = null
      if (connections) {
        connections.delete(peerConnectionIdRef.current)
      }
      dataChannel.close()
      connection.close()
    }
  }, [self, peerConnectionId, updatePeer, removePeer])

  return null
}

function extractUfrag(sdp: string = '') {
  const ufragLine = sdp.match(/a=ice-ufrag:(.*)/);
  return ufragLine ? ufragLine[1] : null;
}

function extractCandidateUfrag(candidate: string) {
  const ufragLine = candidate.match(/ufrag\s+(\S+)/);
  return ufragLine ? ufragLine[1] : null;
}
