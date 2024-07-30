import '../globals.css'
import { FetchProvider } from '@/components/FetchProvider'

const SIGNALING_SERVER_URL = 'http://localhost:8080'

export default function App({ Component, pageProps }) {
  return (
    <FetchProvider baseUrl={SIGNALING_SERVER_URL}>
      <Component {...pageProps}/>
    </FetchProvider>
  )
}
