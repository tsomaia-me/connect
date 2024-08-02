import { FormEvent, HTMLProps, useCallback } from 'react'

export interface FormProps extends HTMLProps<HTMLFormElement> {
  className?: string
}

export function Form(props: FormProps) {
  const onSubmit = props.onSubmit
  const onSubmitCapture = props.onSubmitCapture
  const handleSubmit = useCallback((event: FormEvent<HTMLFormElement>) => {
    if (onSubmit) {
      event.preventDefault()
      onSubmit(event)
    }
  }, [onSubmit])
  const handleSubmitCapture = useCallback((event: FormEvent<HTMLFormElement>) => {
    if (onSubmitCapture) {
      event.preventDefault()
      onSubmitCapture(event)
    }
  }, [onSubmitCapture])

  return (
    <form
      {...props}
      onSubmit={handleSubmit}
      onSubmitCapture={handleSubmitCapture}
    />
  )
}
