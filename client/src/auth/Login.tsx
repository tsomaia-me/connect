'use client'

import { useAuth } from '@/api/auth/hooks'
import { Input, useField } from '@/shared/Field'
import { Button } from '@/shared/Button'
import { Form } from '@/shared/Form'

export default function Login() {
  const username = useField('')
  const password = useField('')
  const auth = useAuth()

  return (
    <Form className="flex flex-col gap-6" onSubmit={auth.execute}>
      <div className="text-white">{auth.result && JSON.stringify(auth.result)}</div>
      <Input placeholder="Username" field={username}/>
      <Input placeholder="Password" field={password}/>
      <Button type="submit">Login</Button>
    </Form>
  )
}
