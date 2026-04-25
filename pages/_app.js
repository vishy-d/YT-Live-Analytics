import '../styles/globals.css'
import Head from 'next/head'

export default function App({ Component, pageProps }) {
  return (
    <>
      <Head>
        <title>YouTube Analytics</title>
        <meta name="description" content="Real-time YouTube live viewer analytics — VS InfoTech"/>
        <meta name="viewport" content="width=device-width, initial-scale=1"/>
      </Head>
      <Component {...pageProps}/>
    </>
  )
}
