import '../globals.css'
import { FetchProvider } from '@/components/FetchProvider'
import { AppProps } from 'next/app'

const API_BASE_URL = 'https://signaling.tsomaia.me/api'

export default function App({ Component, pageProps }: AppProps) {
  return (
    <FetchProvider baseUrl={API_BASE_URL}>
      <Component {...pageProps}/>
    </FetchProvider>
  )
}
