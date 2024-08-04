import { useCallback } from 'react'
import { useFetchBody } from '@/components/FetchProvider'
import { Room, User } from '@/app.models'
import { HttpError } from '@/app.types'

export function useLogin() {
  const fetch = useFetchBody<User | HttpError>()

  return useCallback((username: string) => {
    return fetch('/login', {
      mode: 'cors',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: {
        username: username,
      },
    })
  }, [])
}

export function useFetchRoom() {
  const fetch = useFetchBody<Room | HttpError>()

  return useCallback((key: string) => {
    return fetch(`/room/${key}`, {
      mode: 'cors',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: {
        key,
      },
    })
  }, [])
}

export function useFetchUser() {
  const fetch = useFetchBody<User | HttpError>()

  return useCallback((key: string) => {
    return fetch(`/user/${key}`, {
      mode: 'cors',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: {
        key,
      },
    })
  }, [])
}

export function useCreateRoom() {
  const fetch = useFetchBody<Room | HttpError>()

  return useCallback((userKey: string) => {
    return fetch('/room/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: {
        hostKey: userKey,
      },
    })
  }, [])
}

