import type { Metadata } from "next"
import { Inter, Allura } from 'next/font/google'
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })
const allura = Allura({ 
  weight: '400',
  subsets: ["latin"],
  variable: '--font-allura'
})

export const metadata: Metadata = {
  title: "JusAI - Legal Guidance, Simplified",
  description: "AI-powered legal assistant for simplified legal guidance",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} ${allura.variable}`}>{children}</body>
    </html>
  )
}
