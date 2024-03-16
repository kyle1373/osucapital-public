import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {

  const metadata = {
    title: "osu! capital",
    description: "Use digital currency to invest into osu! players. Compete on the global rankings in a vibrant community full of rhythm-gaming investors!",
    image: "https://github-production-user-asset-6210df.s3.amazonaws.com/59634395/265977862-c4467abc-66f9-4f4d-9a1f-cc247b6d990c.png"
  }
  return (
    <Html lang="en">
      <Head>
        {/* General meta tags */}
        <meta name="description" content={metadata.description} />
        
        {/* Open Graph tags */}
        <meta property="og:title" content={metadata.title} />
        <meta property="og:description" content={metadata.description} />
        <meta property="og:image" content={metadata.image} />
        <meta property="og:type" content="website" />

        {/* Twitter card tags, if you want those specifically */}
        <meta name="twitter:card" content={metadata.image} />
        <meta name="twitter:title" content={metadata.title} />
        <meta name="twitter:description" content={metadata.description} />
        <meta name="twitter:image" content={metadata.image}/>
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
