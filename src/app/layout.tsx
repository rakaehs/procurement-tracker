import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Procurement App',
  description: 'Aplikasi Manajemen Procurement, PR, PO, dan Invoice',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  )
}