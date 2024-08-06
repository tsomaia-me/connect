import { Note } from '@/components/shared/types'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useDashboardNotesContext } from '@/components/DashboardNotesProvider'
import { VideoCamera } from '@/components/icons/VideoCamera'
import classNames from 'classnames'
import { Bin } from '@/components/icons/Bin'
import { Stop } from '@/components/icons/Stop'
import { formatTime, generateId, getFormattedFileSize } from '@/components/shared/utils'
import { User } from '@/app.models'
import { Refresh } from '@/components/icons/Refresh'
import { Play } from '@/components/icons/Play'
import { Pause } from '@/components/icons/Pause'

export interface StickyNoteVideoProps {
  user: User
  note: Note
  isAuthor: boolean
  onDeleteClick: () => void
}

export function StickyNoteVideo(props: StickyNoteVideoProps) {
  const { user, note, isAuthor, onDeleteClick } = props
  const { attachmentStates, updateNote, loadAttachment } = useDashboardNotesContext()
  const userId = user.id
  const noteId = note.id
  const attachments = note.attachments
  const attachment = useMemo(() => attachments.find(a => a.isPrimary && a.type === 'video/webm'), [attachments])
  const attachmentId = attachment?.id ?? null
  const attachmentState = (attachment && attachmentStates[attachment.id]) ?? null
  const recordingVideoRef = useRef<HTMLVideoElement | null>(null)
  const playVideoRef = useRef<HTMLVideoElement | null>(null)
  const [isRecordingRequested, setIsRecordingRequested] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [isRecordingStarted, setIsRecordingStarted] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordedChunksRef = useRef<Blob[]>([])
  const [recordingDuration, setRecordingDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [recordingSize, setRecordingSize] = useState(0)

  const handleRecordClick = useCallback(() => {
    setIsRecordingRequested(true)

    if (attachmentId) {
      loadAttachment(attachmentId, null)
    }
  }, [attachmentId, loadAttachment])

  const handleStopRecordingClick = useCallback(() => {
    const mediaRecorder = mediaRecorderRef.current

    if (mediaRecorder) {
      mediaRecorder.onstop = () => {
        console.log('recording stopped')
        const recording = new Blob(recordedChunksRef.current, { type: 'video/webm' })
        let id

        if (!attachmentState) {
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
              },
            ],
          })
        } else {
          id = attachmentState.id

          updateNote({
            id: noteId,
            attachments: attachments.map(a => a.id !== id ? a : {
              ...a,
              size: recordingSize,
              isPrimary: true,
            }),
          })
        }

        console.log('load attachment', recording)
        loadAttachment(id, recording)
        mediaRecorderRef.current = null
        recordedChunksRef.current = []
      }
    }

    setIsRecordingRequested(false)
    setIsRecordingStarted(false)
  }, [userId, noteId, attachmentState, attachments, recordingSize, updateNote, loadAttachment])

  const handlePlayClick = useCallback(() => {
    const video = playVideoRef.current

    console.log('play', video)

    if (!video) {
      return
    }

    void video.play()
    setIsPlaying(true)
  }, [attachmentId, loadAttachment])

  const handlePauseClick = useCallback(() => {
    const video = playVideoRef.current

    console.log('pause', video)

    if (!video) {
      return
    }

    void video.pause()
    setIsPlaying(false)
  }, [attachmentId, loadAttachment])

  useEffect(() => {
    const video = recordingVideoRef.current

    if (!video || !isRecordingRequested) {
      return
    }

    let mediaRecorder
    let streamObj: MediaStream
    let startTime = NaN
    let interval
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
    const video = playVideoRef.current

    if (!video || !attachmentState.content || !(attachmentState.content instanceof Blob)) {
      return
    }

    let interval
    setRecordingSize(attachmentState.content.size)
    video.src = URL.createObjectURL(attachmentState.content)
    video.onplaying = () => {
      setIsPlaying(true)
      setIsPaused(false)
      clearInterval(interval)
      interval = setInterval(() => setCurrentTime(video.currentTime), 1000)
    }
    video.onended = () => {
      setIsPlaying(false)
      setIsPaused(false)
      clearInterval(interval)
    }
    video.onpause = () => {
      setIsPlaying(false)
      setIsPaused(true)
      clearInterval(interval)
    }
    video.onloadedmetadata = () => {
      if (video.duration === Infinity) {
        video.currentTime = 1e101
        video.ontimeupdate = () => {
          video.ontimeupdate = null
          video.currentTime = 0
          console.log('metadata loaded ontimeupdate', video.duration)
          setRecordingDuration(video.duration)
        }
      } else {
        console.log('metadata loaded', video.duration)
        setRecordingDuration(video.duration)
      }
    }

    return () => {
      video.onplaying = null
      video.onended = null
      video.onpause = null
      video.onloadedmetadata = null
      clearInterval(interval)
    }
  }, [attachmentState])

  return (
    <div className="flex-1 w-full h-full flex flex-col">
      {!attachmentState?.content && (
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

      {attachmentState?.content && (
        <div
          className="flex flex-col w-full h-full flex-1 relative bg-black cursor-pointer"
          onClick={handlePlayClick}
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
            ref={playVideoRef}
            className={classNames('w-full h-full border-0 px-0.5')}
          ></video>
        </div>
      )}

      <div className="flex justify-between items-center p-2">
        <div className="pl-2 text-gray-400">
          {(isRecordingRequested || isPlaying || isPaused)
            ? formatTime(recordingDuration - currentTime)
            : `${note.author.username} / ${getFormattedFileSize(recordingSize)}`}
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

          {(attachmentState?.content && !isRecordingRequested && !isPlaying) && (
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
