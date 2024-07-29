'use client'

import { Form } from '@/shared/Form'
import { Button } from '@/shared/Button'
import { Input, useField } from '@/shared/Field'
import { useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'

const SIGNALING_SERVER_URL = 'http://localhost:8080'

export default function UserPage() {
  const params = useParams()
  const router = useRouter()
  const roomKey = useField<string>('')
  const join = useCallback(() => {
    router.push(`/user/${params?.userKey}/room/${roomKey.value}`)
  }, [params, roomKey])
  const createRoom = useCallback(async () => {
    const response = await fetch(`${SIGNALING_SERVER_URL}/room/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        hostKey: params?.userKey,
      }),
    })

    const room = await response.json()
    router.push(`/user/${params?.userKey}/room/${room.key}`)
  }, [params, roomKey])

  return (
    <div className="flex flex-row justify-center items-center h-full dark:bg-gray-900">
      <div className="mt-16 w-96 flex flex-col gap-6">
        <Form className="flex flex-col gap-6" onSubmit={join}>
          <Input placeholder="Enter a room key" field={roomKey} autoFocus={true}/>
          <Button type="submit">Join</Button>
        </Form>

        <div className="flex flex-row items-center gap-4 px-4">
          <div className="flex-1 border-t border-gray-500"></div>
          <div className="text-gray-500">OR</div>
          <div className="flex-1 border-t border-gray-500"></div>
        </div>

        <Button type="button" variant="danger" onClick={createRoom}>
          Create a Room
        </Button>
      </div>
    </div>
  )
}
