'use client'

import { Button } from '@/components/shared/Button'
import { InputField } from '@/components/shared/Field'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCreateRoom, useFetchRoom, useLogin } from '@/hooks'
import { User } from '@/app.models'
import { isHttpError } from '@/app.utils'
import classNames from 'classnames'
import { useField } from '@/components/shared/hooks'

const STORE_USER_KEY = '@store/user'

export default function HomePage() {
  const router = useRouter()
  const username = useField<string>('')
  const roomKey = useField<string>('')
  const userRef = useRef<User | null>(null)
  const login = useLogin()
  const getRoom = useFetchRoom()
  const createRoom = useCreateRoom()
  const [error, setError] = useState<string | null>(null)

  const getUser = useCallback(async () => {
    if (userRef.current && userRef.current?.username === username.value) {
      return userRef.current as User
    }

    const user = await login(username.value)

    if (isHttpError(user)) {
      setError(user.error)
      return
    }

    userRef.current = user
    localStorage.setItem(STORE_USER_KEY, JSON.stringify(user))

    return user
  }, [username, login])

  const joinRoom = useCallback(async () => {
    const room = await getRoom(roomKey.value)

    if (isHttpError(room)) {
      setError(room.error)
      return
    }

    const user = await getUser()

    if (user) {
      router.push(`/user/${user.key}/room/${roomKey.value}`)
    }
  }, [roomKey, getUser])

  const handleCreateRoom = useCallback(async () => {
    const user = await getUser()

    if (!user) {
      return
    }

    const room = await createRoom(user.key)

    if (isHttpError(room)) {
      setError(room.error)
      return
    }

    router.push(`/user/${user.key}/room/${room.key}`)
  }, [getUser, createRoom])

  useEffect(() => {
    const storedUserData = JSON.parse(localStorage.getItem(STORE_USER_KEY) ?? 'null')

    if (storedUserData) {
      userRef.current = storedUserData
      username.onChange(storedUserData.username)
    }
  }, [username.onChange])

  return (
    <div className="flex flex-row justify-center items-center h-full dark:bg-gray-900">
      <div className="mt-16 w-96 flex flex-col gap-6">
        <div className="flex flex-col gap-6">
          <InputField placeholder="Type your username" field={username} autoFocus={true}/>
        </div>

        <div className="flex flex-row items-center gap-4 px-4">
          <div className="flex-1 border-t border-gray-500"></div>
          <div className="text-gray-500">Enter a room2345679101234</div>
          <div className="flex-1 border-t border-gray-500"></div>
        </div>

        <div className="flex flex-col gap-6">
          <InputField placeholder="Enter a room key" field={roomKey} autoFocus={true}/>
          <Button type="button" onClick={joinRoom}>Join</Button>
        </div>

        <div className="flex flex-row items-center gap-4 px-4">
          <div className="flex-1 border-t border-gray-500"></div>
          <div className="text-gray-500">OR</div>
          <div className="flex-1 border-t border-gray-500"></div>
        </div>

        <Button type="button" variant="danger" onClick={handleCreateRoom}>
          Create a Room
        </Button>

        <div className={classNames('flex flex-col gap-6', !error && 'invisible')}>
          <div className="px-4">
            <div className="flex-1 border-t border-gray-500"></div>
          </div>

          <div className="text-red-500 text-center">
            {error ?? '-'}
          </div>
        </div>
      </div>
    </div>
  )
}
