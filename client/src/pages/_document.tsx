import { Head, Html, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html lang="en" className="dark">
      <Head/>
      <body>
      <Main/>
      <NextScript/>
      <script src="/scripts/flowbite.min.js"></script>
      </body>
    </Html>
  )
}