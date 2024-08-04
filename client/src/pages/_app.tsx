import '../globals.css'
import { FetchProvider } from '@/components/FetchProvider'
import { AppProps } from 'next/app'
import { BASE_URL } from '@/api/constants'

const API_BASE_URL = `${BASE_URL}/api`

export default function App({ Component, pageProps }: AppProps) {
  return (
    <FetchProvider baseUrl={API_BASE_URL}>
      <Component {...pageProps}/>
    </FetchProvider>
  )
}
