import { Note } from '@/components/shared/types'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useDashboardNotesContext } from '@/components/DashboardNotesProvider'
import { VideoCamera } from '@/components/icons/VideoCamera'
import classNames from 'classnames'
import { Bin } from '@/components/icons/Bin'
import { Stop } from '@/components/icons/Stop'
import { formatTime, generateId, getFormattedFileSize, readAsArrayBuffer } from '@/components/shared/utils'
import { User } from '@/app.models'
import { Refresh } from '@/components/icons/Refresh'
import { Play } from '@/components/icons/Play'
import { Pause } from '@/components/icons/Pause'
import { Peer, PeerEvent, useWebRTCContext } from '@/components/WebRTCProvider'

export interface StickyNoteVideoProps {
  user: User
  note: Note
  isAuthor: boolean
  onDeleteClick: () => void
}

export function StickyNoteVideo(props: StickyNoteVideoProps) {
  const { user, note, isAuthor, onDeleteClick } = props
  const { self, peers, send, addPeerEventListener, removePeerEventListener } = useWebRTCContext()
  const { attachmentStates, updateNote, loadAttachment } = useDashboardNotesContext()
  const userId = user.id
  const noteId = note.id
  const attachments = note.attachments
  const videoAttachment = useMemo(() => attachments.find(a => a.isPrimary && a.role === 'video'), [attachments])
  const videoAttachmentId = videoAttachment?.id ?? null
  const videoAttachmentState = (videoAttachment && attachmentStates[videoAttachment.id]) ?? null
  const thumbnailAttachment = useMemo(() => attachments.find(a => a.role === 'thumbnail'), [attachments])
  const thumbnailAttachmentId = thumbnailAttachment?.id ?? null
  const thumbnailAttachmentState = (thumbnailAttachment && attachmentStates[thumbnailAttachment.id]) ?? null
  const recordingVideoRef = useRef<HTMLVideoElement | null>(null)
  const playerVideoRef = useRef<HTMLVideoElement | null>(null)
  const streamingVideoRef = useRef<HTMLVideoElement | null>(null)
  const thumbnailCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const thumbnailImageRef = useRef<HTMLImageElement | null>(null)
  const [isRecordingRequested, setIsRecordingRequested] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [isRecordingStarted, setIsRecordingStarted] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordedChunksRef = useRef<Blob[]>([])
  const [recordingDuration, setRecordingDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [recordingSize, setRecordingSize] = useState(0)
  const loadAttachmentRef = useRef(loadAttachment)
  const attachmentsRef = useRef(attachments)
  const videoAttachmentStateRef = useRef(videoAttachmentState)
  const peersRef = useRef(peers)
  const selfRef = useRef(self)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [thumbnailData, setThumbnailData] = useState<ArrayBuffer | null>(null)
  const noteAuthorId = note.author.id

  loadAttachmentRef.current = loadAttachment
  attachmentsRef.current = attachments
  videoAttachmentStateRef.current = videoAttachmentState
  peersRef.current = peers
  selfRef.current = self

  const handleRecordClick = useCallback(() => {
    setIsRecordingRequested(true)
    setCurrentTime(0)
    setRecordingSize(0)
    setRecordingDuration(0)

    if (videoAttachmentId) {
      loadAttachmentRef.current(videoAttachmentId, null)
    }
  }, [videoAttachmentId])

  const handleStopRecordingClick = useCallback(() => {
    const mediaRecorder = mediaRecorderRef.current

    if (mediaRecorder) {
      mediaRecorder.onstop = () => {
        console.log('recording stopped')
        const recording = new Blob(recordedChunksRef.current, { type: 'video/webm' })
        const videoAttachmentState = videoAttachmentStateRef.current
        let id: string

        if (!videoAttachmentState) {
          id = generateId()
          updateNote({
            id: noteId,
            attachments: [
              ...attachments,
              {
                id,
                name: `recording_${userId}_${noteId}_${new Date().toISOString()}`,
                type: 'video/webm',
                size: recordingSize,
                isPrimary: true,
                role: 'video',
                metadata: {
                  duration: recordingDuration,
                },
              },
            ],
          })
        } else {
          id = videoAttachmentState.id

          updateNote({
            id: noteId,
            attachments: attachmentsRef.current.map(a => a.id !== id ? a : {
              ...a,
              size: recordingSize,
              isPrimary: true,
              role: 'video',
            }),
          })
        }

        console.log('load videoAttachment', recording)
        loadAttachmentRef.current(id, recording)
        mediaRecorderRef.current = null
        recordedChunksRef.current = []
      }
    }

    setIsRecordingRequested(false)
    setIsRecordingStarted(false)
  }, [userId, noteId, recordingSize, recordingDuration, updateNote])

  const handlePlayClick = useCallback(() => {
    const video = playerVideoRef.current

    console.log('play', video)

    if (!video) {
      return
    }

    if (videoAttachmentState?.status === 'local') {
      void video.play()
      setIsPlaying(true)
    } else if (videoAttachmentState?.status === 'placeholder') {
      const peer = peersRef.current.find(p => p.participant.user.id === noteAuthorId)


      if (peer?.connection) {
        const connection = peer.connection
        console.log('requestedvideo.play', peer)

        connection.ontrack = event => {
          console.log('requestedvideo.ontrack', event)
          connection.ontrack = null
          video.srcObject = event.streams[0]
          void video.play()
        }

        send(peer.connectionId, {
          event: `requestedvideo:${noteId}`,
          payload: {},
        })
      }
    }
  }, [noteId, noteAuthorId, videoAttachmentId, videoAttachmentState?.status])

  const handlePauseClick = useCallback(() => {
    const video = playerVideoRef.current

    console.log('pause', video)

    if (!video) {
      return
    }

    void video.pause()
    setIsPlaying(false)
  }, [videoAttachmentId])

  const handleToggleClick = useCallback(() => {
    if (isPlaying) {
      handlePauseClick()
    } else {
      handlePlayClick()
    }
  }, [isPlaying, handlePlayClick, handlePauseClick])

  useEffect(() => {
    const video = recordingVideoRef.current

    if (!video || !isRecordingRequested) {
      return
    }

    let mediaRecorder: MediaRecorder
    let streamObj: MediaStream
    let startTime = NaN
    let interval: any
    navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then(stream => {
      console.log('starting recording')
      video.srcObject = stream
      streamObj = stream
      mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      mediaRecorder.ondataavailable = event => {
        if (event.data.size) {
          console.log('recoding chunk available', event.data.size)
          recordedChunksRef.current.push(event.data)
          setRecordingSize(size => size + event.data.size)
        }
      }
      mediaRecorder.start(1000)

      startTime = Date.now()
      interval = setInterval(() => {
        setRecordingDuration(Math.floor((Date.now() - startTime) / 1000))
      }, 1000)
      setIsRecordingStarted(true)
    })

    return () => {
      if (streamObj) {
        streamObj.getTracks().forEach(track => track.stop())
      }

      if (mediaRecorder) {
        mediaRecorder.stop()
        mediaRecorder.ondataavailable = null
      }

      clearInterval(interval)
    }
  }, [isRecordingRequested])

  useEffect(() => {
    const player = playerVideoRef.current
    const streamer = streamingVideoRef.current

    if (!player || !streamer || !videoAttachmentState?.content || !(videoAttachmentState?.content instanceof Blob)) {
      return
    }

    let interval: any
    const url = URL.createObjectURL(videoAttachmentState.content)
    setVideoUrl(url)
    player.src = url
    player.onplaying = () => {
      console.log('on playing')
      setIsPlaying(true)
      setIsPaused(false)
      clearInterval(interval)
      setCurrentTime(player.currentTime)
      interval = setInterval(() => {
        console.log('time changed', player.currentTime, formatTime(player.currentTime))
        setCurrentTime(player.currentTime)
      }, 1000)
    }
    player.onended = () => {
      setCurrentTime(0)
      setIsPlaying(false)
      setIsPaused(false)
      clearInterval(interval)
    }
    player.onpause = () => {
      setIsPlaying(false)
      setIsPaused(true)
      clearInterval(interval)
    }

    return () => {
      player.onplaying = null
      player.onended = null
      player.onpause = null
      player.onloadedmetadata = null
      clearInterval(interval)
    }
  }, [noteId, videoAttachmentState?.content, updateNote])

  useEffect(() => {
    const player = playerVideoRef.current
    const streamer = streamingVideoRef.current
    const thumbnailCanvas = thumbnailCanvasRef.current
    const thumbnailImage = thumbnailImageRef.current

    if (!player || !streamer || !thumbnailCanvas || !thumbnailImage || !videoUrl) {
      return
    }

    function onRequestedVideo(event: PeerEvent) {
      console.log('requestedvideo.received', event)
      const peer = peersRef.current.find(p => p.connectionId === event.peerId) as Peer

      console.log('requestedvideo.peer', peer)

      if (peer?.connection && streamer && ('captureStream' in (streamer as any) || 'mozCaptureStream' in (streamer as any))) {
        const connection = peer.connection
        const captureStream = (streamer as any)['captureStream'] || (streamer as any)['mozCaptureStream']
        streamer.play().then(() => {
          const stream = captureStream.call(streamer)

          console.log('requestedvideo.listening')
          console.log('streamer.rcs', stream)

          stream.getTracks().forEach((track: MediaStreamTrack) => {
            connection.addTrack(track, stream)
            console.log('requestedvideo.added', track, stream)
          })
        })
      }
    }

    const thumbnailContext = thumbnailCanvas.getContext('2d')
    streamer.src = player.src
    console.log('streamer.src', streamer.src, videoUrl)
    streamer.width = player.width
    streamer.height = player.height
    thumbnailCanvas.width = player.width
    thumbnailCanvas.height = player.height
    thumbnailImage.width = player.width
    thumbnailImage.height = player.height
    streamer.onloadeddata = () => {
      streamer.onloadeddata = null
      streamer.oncanplay = () => {
        addPeerEventListener(`requestedvideo:${noteId}`, onRequestedVideo)

        streamer.oncanplay = null
        streamer.currentTime = 1;
        streamer.onseeked = () => {
          streamer.onseeked = null
          if (thumbnailContext && thumbnailCanvas) {
            thumbnailContext.drawImage(streamer, 0, 0, thumbnailCanvas.width, thumbnailCanvas.height)
            thumbnailCanvas.toBlob(thumbnailBlob => {
              if (!thumbnailBlob) {
                return
              }

              readAsArrayBuffer(thumbnailBlob).then(buffer => {
                setThumbnailData(buffer)
              })
            })
          }
        }
      }
    }

    return () => {
      removePeerEventListener(`requestedvideo:${noteId}`, onRequestedVideo)
    }
  }, [noteId, videoUrl, updateNote])

  useEffect(() => {
    if (!thumbnailData) {
      return
    }

    console.log('streamer.3rc')
    const id = generateId()
    updateNote({
      id: noteId,
      attachments: [
        ...attachmentsRef.current.filter(a => a.role !== 'thumbnail'),
        {
          id,
          name: `thumbnail_${userId}_${noteId}_${new Date().toISOString()}`,
          type: 'image/png',
          size: new Blob([thumbnailData], { type: 'image/png' }).size,
          isPrimary: false,
          role: 'thumbnail',
          metadata: {},
        },
      ],
    })
    loadAttachmentRef.current(id, thumbnailData)
  }, [thumbnailData])

  useEffect(() => {
    if (isPlaying || isPaused) {
      return
    }

    const thumbnailImage = thumbnailImageRef.current

    if (thumbnailImage && thumbnailAttachmentState?.content) {
      const thumbnailBlob = new Blob([thumbnailAttachmentState.content], {
        type: thumbnailAttachmentState.attachment.type
      })
      thumbnailImage.src = URL.createObjectURL(thumbnailBlob)
    }
  }, [isPlaying, isPaused, thumbnailAttachmentState?.content, thumbnailAttachmentState?.attachment.type])

  return (
    <div className="flex-1 w-full h-full flex flex-col">
      {(!videoAttachmentState?.content && videoAttachmentState?.status !== 'placeholder') && (
        <div className="flex flex-col w-full h-full flex-1">
          {!isRecordingStarted && (
            <div
              className="flex-1 w-full h-full flex flex-col justify-center items-center cursor-pointer bg-black"
              onClick={handleRecordClick}
            >
              {!isRecordingRequested && (
                <div className="flex flex-col justify-center items-center">
                  <button>
                    <VideoCamera/>
                  </button>

                  <p className="text-white text-sm mt-2">Click here to record</p>
                </div>
              )}
            </div>
          )}

          {isRecordingRequested && (
            <video
              ref={recordingVideoRef}
              className={classNames(
                isRecordingStarted && 'w-full h-full border-0 px-0.5',
                !isRecordingStarted && 'w-0 h-0',
              )}
              autoPlay={true}
            ></video>
          )}
        </div>
      )}

      {videoAttachmentState && (videoAttachmentState?.content || videoAttachmentState.status === 'placeholder') && (
        <div
          className="flex flex-col w-full h-full flex-1 relative bg-black cursor-pointer"
          onClick={handleToggleClick}
        >
          {!isPlaying && (
            <div
              className="absolute top-0 left-0 right-0 bottom-0 flex flex-col justify-center items-center"
            >
              <button>
                <Play/>
              </button>
            </div>
          )}

          <video
            ref={playerVideoRef}
            className={classNames('w-full h-full border-0 px-0.5', !isPlaying && !isPaused && 'hidden')}
            width={256}
            height={189}
          ></video>

          {!isPlaying && !isPaused && (
            <img
              ref={thumbnailImageRef}
              alt=""
            ></img>
          )}

          <div className="w-0 h-0 overflow-hidden">
            <video
              ref={streamingVideoRef}
            ></video>

            <canvas
              ref={thumbnailCanvasRef}
            ></canvas>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center p-2">
        <div className="pl-2 text-gray-400">
          {isRecordingRequested && formatTime(recordingDuration)}
          {(videoAttachmentState && (isPlaying || isPaused))
            && formatTime(videoAttachmentState.attachment.metadata.duration - currentTime)}

          {!isRecordingRequested && !isPlaying && !isPaused ? note.author.username : ''}

          {isRecordingRequested && (' / ' + getFormattedFileSize(recordingSize))}

          {(!isPlaying && !isPaused && videoAttachmentState?.attachment) &&
            ' / ' + getFormattedFileSize(videoAttachmentState.attachment.size)
          }
        </div>

        <div className="flex justify-end items-center gap-4">
          {isRecordingRequested && (
            <button
              className={classNames(
                isAuthor ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'
              )}
              onClick={handleStopRecordingClick}
            >
              <Stop/>
            </button>
          )}

          {(videoAttachmentState?.content && !isRecordingRequested && !isPlaying) && (
            <button
              className={classNames(
                isAuthor ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'
              )}
              onClick={handleRecordClick}
            >
              <Refresh/>
            </button>
          )}

          {isPlaying && (
            <button
              className={classNames(
                isAuthor ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'
              )}
              onClick={handlePauseClick}
            >
              <Pause/>
            </button>
          )}

          <button className={
            classNames(
              isAuthor ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'
            )
          } onClick={onDeleteClick}>
            <Bin/>
          </button>
        </div>
      </div>
    </div>
  )
}
