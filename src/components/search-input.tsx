'use client'

import { useSearchParams, usePathname, useRouter } from 'next/navigation'
import { Search } from 'lucide-react'
import { useRef } from 'react'

export default function SearchInput() {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const { replace } = useRouter()
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Fungsi pencarian otomatis dengan jeda 300ms (Debounce)
  const handleSearch = (term: string) => {
    if (timerRef.current) clearTimeout(timerRef.current)

    timerRef.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString())
      if (term.trim()) {
        params.set('search', term)
      } else {
        params.delete('search')
      }
      replace(`${pathname}?${params.toString()}`)
    }, 300)
  }

  return (
    <div className="relative flex items-center min-w-[240px] sm:w-[280px]">
      <Search className="absolute left-2.5 h-3.5 w-3.5 text-slate-400" />
      <input
        type="text"
        placeholder="Cari No PR, PO, Invoice, Vendor..."
        onChange={(e) => handleSearch(e.target.value)}
        defaultValue={searchParams.get('search')?.toString()}
        className="w-full border rounded-md pl-8 pr-2 py-1.5 text-xs bg-background focus:outline-none focus:ring-1 focus:ring-slate-400"
      />
    </div>
  )
}