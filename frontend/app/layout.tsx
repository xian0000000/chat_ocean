import type { Metadata } from 'next'
import { Cinzel, Crimson_Pro } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/context/AuthContext'

const cinzel = Cinzel({ subsets: ['latin'], variable: '--font-cinzel', weight: ['400', '600'] })
const crimson = Crimson_Pro({ subsets: ['latin'], variable: '--font-crimson', weight: ['300', '400'], style: ['normal', 'italic'] })

export const metadata: Metadata = {
  title: 'Ocean Chat',
  description: 'Chat dari kedalaman samudra',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={`${cinzel.variable} ${crimson.variable}`}>
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
