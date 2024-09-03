import { SEO_METADATA } from '@constants/constants'
import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <meta name="description" content={SEO_METADATA.description} />
        <meta property="og:title" content={SEO_METADATA.title} />
        <meta property="og:description" content={SEO_METADATA.description} />
        <meta property="og:type" content="website" />
        <meta name="twitter:title" content={SEO_METADATA.title} />
        <meta name="twitter:description" content={SEO_METADATA.description} />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
