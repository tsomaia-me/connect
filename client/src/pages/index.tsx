'use client'

import { Form } from '@/shared/Form'
import { Button } from '@/shared/Button'
import { Input, useField } from '@/shared/Field'
import { useCallback } from 'react'
import { useRouter } from 'next/navigation'

const SIGNALING_SERVER_URL = 'http://localhost:8080'

export default function HomePage() {
  const router = useRouter()
  const username = useField<string>('')
  const login = useCallback(async () => {
    const response = await fetch(`${SIGNALING_SERVER_URL}/login`, {
      mode: 'cors',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: username.value,
      })
    })
    const data = await response.json()
    router.push(`/user/${data.key}`)
  }, [username])

  return (
    <div className="flex flex-row justify-center items-center h-full dark:bg-gray-900">
      <div className="mt-16 w-96 flex flex-col gap-6">
        <Form className="flex flex-col gap-6" onSubmit={login}>
          <Input placeholder="Type your username" field={username} autoFocus={true}/>
          <Button type="submit">Log in</Button>
        </Form>
      </div>
    </div>
  )
}
