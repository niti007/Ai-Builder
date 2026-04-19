import type { Metadata } from 'next'
import { Anton, IBM_Plex_Mono } from 'next/font/google'
import './globals.css'

const anton = Anton({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-anton',
})

const mono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '600'],
  variable: '--font-mono',
})

export const metadata: Metadata = {
  title: 'Builder Collab',
  description: '1–2 week micro-collabs for AI engineers, founders, and creators.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body
        className={`${anton.variable} ${mono.variable} min-h-screen antialiased`}
        style={{ fontFamily: 'var(--font-mono), monospace' }}
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  )
}
