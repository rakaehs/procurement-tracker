'use client'

import { useSearchParams, usePathname, useRouter } from 'next/navigation'
import { ArrowUpDown } from 'lucide-react'

export default function SortSelect() {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const { replace } = useRouter()

  const handleSortChange = (sortValue: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (sortValue) {
      params.set('sort', sortValue)
    } else {
      params.delete('sort')
    }
    replace(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="flex items-center gap-1.5 bg-slate-50 border rounded-md px-2.5 py-1 text-xs">
      <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
      <span className="text-slate-500 font-medium hidden sm:inline">Urutkan:</span>
      <select
        name="sort"
        defaultValue={searchParams.get('sort')?.toString() || ''}
        onChange={(e) => handleSortChange(e.target.value)}
        className="bg-transparent border-none text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer pr-1"
      >
        <option value="">Default</option>
        <option value="newest">PO Terbaru</option>
        <option value="oldest">PO Terlama</option>
        <option value="highest_po">Nilai PO Tertinggi</option>
        <option value="lowest_po">Nilai PO Terendah</option>
        <option value="highest_invoice">Nilai Invoice Tertinggi</option>
        <option value="lowest_invoice">Nilai Invoice Terendah</option>
        <option value="highest_paid">Total Paid Terbesar</option>
        <option value="lowest_paid">Total Paid Terkecil</option>
        <option value="highest_outstanding">Outstanding Terbesar</option>
        <option value="lowest_outstanding">Outstanding Terkecil</option>
      </select>
    </div>
  )
}