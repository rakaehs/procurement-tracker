import { redirect } from 'next/navigation'

export default function RootPage() {
  // Otomatis arahkan pengunjung dari halaman utama (/) ke (/dashboard)
  // File proxy.ts nanti yang akan otomatis mencegatnya:
  // Jika belum login -> dilempar ke /login
  // Jika sudah login -> dibiarkan masuk ke /dashboard
  redirect('/dashboard')
}