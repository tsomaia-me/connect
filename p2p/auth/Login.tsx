'use client'

import { useAuth } from 'client/src/api/auth/hooks'
import { Input, useField } from 'client/src/shared/Field'
import { Button } from 'client/src/shared/Button'
import { Form } from 'client/src/shared/Form'

export default function Login() {
  const username = useField<string>('')
  const password = useField<string>('')
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
