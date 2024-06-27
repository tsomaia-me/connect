import { BASE_URL } from '@/api/constants'
import { useMutation } from '@/shared/hooks'

export function useAuth() {
  return useMutation(async () => {
    const response = await fetch(`${BASE_URL}/auth/login`, {
      method: 'post',
    })

    return await response.json()
  }, [])
}
