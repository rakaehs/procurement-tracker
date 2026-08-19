'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Search, ArrowUpDown, ExternalLink } from 'lucide-react'

export interface TrackingRow {
  company: string
  project: string
  no_pr: string
  status_pr: string
  no_po: string
  status_po: string
  tanggal_po: string
  vendor: string
  nilai_po: number
  file_po: string | null
  no_invoice: string
  status_inv: string
  tanggal_invoice: string
  nilai_invoice: number
  file_invoice: string | null
  total_paid: number
  payment_status: string
  tanggal_bayar: string
  metode_bayar: string
  file_payment: string | null
  outstanding: number
}

export default function TrackingTable({ initialRows }: { initialRows: TrackingRow[] }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [sortOption, setSortOption] = useState('')

  // Pencarian dan Pengurutan di sisi client (Instan & Tanpa Scroll Jump)
  const filteredAndSortedRows = useMemo(() => {
    let result = [...initialRows]

    // 1. Filter Pencarian Real-Time
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase()
      result = result.filter((row) => {
        return (
          row.no_pr.toLowerCase().includes(q) ||
          row.no_po.toLowerCase().includes(q) ||
          row.no_invoice.toLowerCase().includes(q) ||
          row.vendor.toLowerCase().includes(q) ||
          row.company.toLowerCase().includes(q) ||
          row.project.toLowerCase().includes(q)
        )
      })
    }

    // 2. Opsi Pengurutan
    if (sortOption === 'newest') {
      result.sort((a, b) => new Date(b.tanggal_po).getTime() - new Date(a.tanggal_po).getTime())
    } else if (sortOption === 'oldest') {
      result.sort((a, b) => new Date(a.tanggal_po).getTime() - new Date(b.tanggal_po).getTime())
    } else if (sortOption === 'highest_po') {
      result.sort((a, b) => b.nilai_po - a.nilai_po)
    } else if (sortOption === 'lowest_po') {
      result.sort((a, b) => a.nilai_po - b.nilai_po)
    } else if (sortOption === 'highest_invoice') {
      result.sort((a, b) => b.nilai_invoice - a.nilai_invoice)
    } else if (sortOption === 'lowest_invoice') {
      result.sort((a, b) => a.nilai_invoice - b.nilai_invoice)
    } else if (sortOption === 'highest_paid') {
      result.sort((a, b) => b.total_paid - a.total_paid)
    } else if (sortOption === 'lowest_paid') {
      result.sort((a, b) => a.total_paid - b.total_paid)
    } else if (sortOption === 'highest_outstanding') {
      result.sort((a, b) => b.outstanding - a.outstanding)
    } else if (sortOption === 'lowest_outstanding') {
      result.sort((a, b) => a.outstanding - b.outstanding)
    }

    return result
  }, [initialRows, searchQuery, sortOption])

  return (
    <Card>
      {/* Header Tabel Dengan Search Box & Dropdown Urutkan */}
      <CardHeader className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b">
        <CardTitle className="text-base font-semibold">
          Tabel Tracking Pengadaan & Pembayaran
        </CardTitle>

        <div className="flex flex-wrap items-center gap-2">
          {/* Input Pencarian */}
          <div className="relative flex items-center min-w-[240px] sm:w-[280px]">
            <Search className="absolute left-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Cari No PR, PO, Invoice, Vendor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full border rounded-md pl-8 pr-2 py-1.5 text-xs bg-background focus:outline-none focus:ring-1 focus:ring-slate-400"
            />
          </div>

          {/* Select Sorting */}
          <div className="flex items-center gap-1.5 bg-slate-50 border rounded-md px-2.5 py-1 text-xs">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-slate-500 font-medium hidden sm:inline">Urutkan:</span>
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value)}
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
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        <div className="max-h-[600px] overflow-auto border rounded-lg">
          <table className="w-full text-left text-[11px] border-collapse whitespace-nowrap">
            <thead className="sticky top-0 bg-white z-20 shadow-sm text-muted-foreground">
              <tr>
                <th colSpan={5} className="h-2 p-0 border-r border-b-0 bg-slate-300"></th>
                <th colSpan={6} className="h-2 p-0 border-r border-b-0 bg-blue-300"></th>
                <th colSpan={5} className="h-2 p-0 border-r border-b-0 bg-emerald-300"></th>
                <th colSpan={4} className="h-2 p-0 border-r border-b-0 bg-amber-300"></th>
                <th colSpan={1} className="h-2 p-0 border-b-0 bg-red-300"></th>
              </tr>
              <tr className="border-b bg-muted">
                <th className="p-2 text-center w-10 border-r">No</th>
                <th className="p-2 text-center border-r">Company</th>
                <th className="p-2 text-center border-r">Project</th>
                <th className="p-2 text-center border-r">No PR</th>
                <th className="p-2 text-center border-r border-r-2">Status PR</th>

                <th className="p-2 text-center border-r">No PO</th>
                <th className="p-2 text-center border-r">Tanggal PO</th>
                <th className="p-2 text-center border-r">Vendor</th>
                <th className="p-2 text-center border-r">Nilai PO</th>
                <th className="p-2 text-center border-r">Status PO</th>
                <th className="p-2 text-center border-r border-r-2">File PO</th>

                <th className="p-2 text-center border-r">No Invoice</th>
                <th className="p-2 text-center border-r">Tgl Invoice</th>
                <th className="p-2 text-center border-r">Nilai Invoice</th>
                <th className="p-2 text-center border-r">Status Inv</th>
                <th className="p-2 text-center border-r border-r-2">File Inv</th>

                <th className="p-2 text-center border-r">Total Paid</th>
                <th className="p-2 text-center border-r">Tgl Bayar</th>
                <th className="p-2 text-center border-r">Metode</th>
                <th className="p-2 text-center border-r border-r-2">Bukti</th>

                <th className="p-2 text-center font-bold text-amber-700">Outstanding</th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedRows.length > 0 ? (
                filteredAndSortedRows.map((row, idx) => (
                  <tr key={idx} className="border-b hover:bg-muted/30">
                    <td className="p-2 text-center font-medium text-muted-foreground border-r">{idx + 1}</td>
                    <td className="p-2 border-r">{row.company}</td>
                    <td className="p-2 border-r">{row.project}</td>
                    <td className="p-2 text-center font-medium border-r">{row.no_pr}</td>
                    <td className="p-2 text-center border-r border-r-2">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                        row.status_pr === 'Approved' ? 'bg-emerald-100 text-emerald-800' :
                        row.status_pr === 'Submitted' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {row.status_pr}
                      </span>
                    </td>

                    <td className="p-2 text-center font-medium border-r">{row.no_po}</td>
                    <td className="p-2 text-center border-r">{row.tanggal_po}</td>
                    <td className="p-2 border-r">{row.vendor}</td>
                    <td className="p-2 text-center border-r">Rp {row.nilai_po.toLocaleString('id-ID')}</td>
                    <td className="p-2 text-center border-r">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                        row.status_po === 'Released' || row.status_po === 'released' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {row.status_po}
                      </span>
                    </td>
                    <td className="p-2 text-center border-r border-r-2">
                      {row.file_po ? (
                        <a href={row.file_po} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-1 font-medium justify-center">
                          <ExternalLink className="h-3 w-3" /> Lihat
                        </a>
                      ) : <span className="text-muted-foreground">-</span>}
                    </td>

                    <td className="p-2 text-center border-r">{row.no_invoice}</td>
                    <td className="p-2 text-center border-r">{row.tanggal_invoice}</td>
                    <td className="p-2 text-center border-r">Rp {row.nilai_invoice.toLocaleString('id-ID')}</td>
                    <td className="p-2 text-center border-r">
                      {row.status_inv !== '-' ? (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-100 text-purple-800">
                          {row.status_inv}
                        </span>
                      ) : <span className="text-muted-foreground">-</span>}
                    </td>
                    <td className="p-2 text-center border-r border-r-2">
                      {row.file_invoice ? (
                        <a href={row.file_invoice} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-1 font-medium justify-center">
                          <ExternalLink className="h-3 w-3" /> Lihat
                        </a>
                      ) : <span className="text-muted-foreground">-</span>}
                    </td>

                    <td className="p-2 text-center text-emerald-600 font-medium border-r">Rp {row.total_paid.toLocaleString('id-ID')}</td>
                    <td className="p-2 text-center border-r">{row.tanggal_bayar}</td>
                    <td className="p-2 text-center border-r">{row.metode_bayar}</td>
                    <td className="p-2 text-center border-r border-r-2">
                      {row.file_payment ? (
                        <a href={row.file_payment} target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:underline inline-flex items-center gap-1 font-medium justify-center">
                          <ExternalLink className="h-3 w-3" /> Lihat
                        </a>
                      ) : <span className="text-muted-foreground">-</span>}
                    </td>

                    <td className="p-2 text-center text-amber-600 font-bold">Rp {row.outstanding.toLocaleString('id-ID')}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={21} className="p-6 text-center text-muted-foreground">
                    Tidak ada data tracking PO released yang sesuai dengan kriteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}