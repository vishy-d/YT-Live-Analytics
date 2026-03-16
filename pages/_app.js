import '../styles/globals.css'
import Head from 'next/head'

export default function App({ Component, pageProps }) {
  return (
    <>
      <Head>
        <title>YT LIVE Analytics — Command Center</title>
        <meta name="description" content="Real-time YouTube LIVE viewer analytics dashboard"/>
        <meta name="viewport" content="width=device-width, initial-scale=1"/>
      </Head>
      <Component {...pageProps}/>
    </>
  )
}
