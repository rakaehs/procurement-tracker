'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { FileText, Search, Eye, Plus } from 'lucide-react'
import Link from 'next/link'

export default function InvoicesPage() {
  const router = useRouter()
  const supabase = createClient()

  const [invoices, setInvoices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    async function fetchInvoices() {
      setLoading(true)
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          purchase_orders (
            po_number,
            vendors (vendor_name)
          ),
          projects (project_name),
          companies (company_name),
          payments (amount)
        `)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching invoices:', error.message)
      } else {
        setInvoices(data || [])
      }
      setLoading(false)
    }

    fetchInvoices()
  }, [supabase])

  const filteredInvoices = invoices.filter(inv => {
    const term = searchTerm.toLowerCase()
    const invNum = (inv.invoice_number || '').toLowerCase()
    const poNum = (inv.purchase_orders?.po_number || '').toLowerCase()
    const projName = (inv.projects?.project_name || '').toLowerCase()
    const compName = (inv.companies?.company_name || '').toLowerCase()
    const vendorName = (inv.purchase_orders?.vendors?.vendor_name || '').toLowerCase()
    return (
      invNum.includes(term) || 
      poNum.includes(term) || 
      projName.includes(term) || 
      compName.includes(term) ||
      vendorName.includes(term)
    )
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Paid':
        return 'bg-emerald-100 text-emerald-700 border-emerald-300'
      case 'Partial Paid':
        return 'bg-amber-100 text-amber-700 border-amber-300'
      case 'Submit To Finance':
        return 'bg-blue-100 text-blue-700 border-blue-300'
      default:
        return 'bg-slate-100 text-slate-700 border-slate-300'
    }
  }

  if (loading) return <div className="p-10 text-center text-slate-500">Memuat daftar invoice...</div>

  return (
    <div className="p-6 max-w-[98%] mx-auto space-y-6 pb-24">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <FileText className="w-8 h-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Daftar Invoice Vendor</h1>
            <p className="text-xs text-slate-500">Monitoring seluruh tagihan, status pembayaran, dan sisa outstanding secara terpusat.</p>
          </div>
        </div>

        <Link href="/invoices/add">
          <Button>
            <Plus className="w-4 h-4 mr-2" /> Tambah Invoice
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <CardTitle className="text-base">Semua Tagihan (Invoices)</CardTitle>
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <Input 
                placeholder="Cari invoice, PO, project, vendor..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md bg-white overflow-x-auto">
            <Table className="whitespace-nowrap text-xs">
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="w-12 text-center">No</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>PO</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Nomor Invoice</TableHead>
                  <TableHead>Jenis Tagihan</TableHead>
                  <TableHead>Tanggal Invoice</TableHead>
                  <TableHead>Jatuh Tempo</TableHead>
                  <TableHead className="text-right">Nilai Invoice</TableHead>
                  <TableHead className="text-right">Total Terbayarkan</TableHead>
                  <TableHead className="text-right">Outstanding</TableHead>
                  <TableHead className="text-center">Persentase</TableHead>
                  <TableHead className="text-center">Status Invoice</TableHead>
                  <TableHead>Catatan</TableHead>
                  <TableHead className="text-center">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.map((inv, idx) => {
                  const invoiceAmount = Number(inv.amount || 0)
                  const totalPaid = (inv.payments || []).reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0)
                  const outstanding = invoiceAmount - totalPaid
                  const percentage = invoiceAmount > 0 ? Math.min(100, (totalPaid / invoiceAmount) * 100) : 0
                  
                  const noteText = inv.notes && inv.notes.trim() !== '' ? inv.notes : '-'
                  const billingType = inv.billing_type || 'Termin'

                  return (
                    <TableRow key={inv.id}>
                      <TableCell className="text-center font-medium">{idx + 1}</TableCell>
                      <TableCell>{inv.companies?.company_name || '-'}</TableCell>
                      <TableCell className="font-medium">{inv.projects?.project_name || '-'}</TableCell>
                      <TableCell className="font-semibold text-blue-600">{inv.purchase_orders?.po_number || '-'}</TableCell>
                      <TableCell>{inv.purchase_orders?.vendors?.vendor_name || '-'}</TableCell>
                      <TableCell className="font-bold text-slate-800">{inv.invoice_number}</TableCell>
                      <TableCell>
                        <span className="px-2 py-0.5 text-[10px] font-medium rounded bg-slate-100 text-slate-700 border">
                          {billingType}
                        </span>
                      </TableCell>
                      <TableCell className="text-slate-600">{inv.invoice_date || '-'}</TableCell>
                      <TableCell className="text-amber-600 font-medium">{inv.due_date || '-'}</TableCell>
                      <TableCell className="text-right font-semibold">
                        Rp {invoiceAmount.toLocaleString('id-ID')}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-emerald-600">
                        Rp {totalPaid.toLocaleString('id-ID')}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-amber-700">
                        Rp {outstanding.toLocaleString('id-ID')}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <div className="w-12 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                            <div 
                              className={`h-full ${percentage >= 100 ? 'bg-emerald-500' : 'bg-blue-500'}`} 
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-medium">{percentage.toFixed(0)}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={`px-2 py-0.5 text-[10px] font-semibold rounded border ${getStatusBadge(inv.status)}`}>
                          {inv.status || 'Invoice Received'}
                        </span>
                      </TableCell>
                      <TableCell className="text-slate-500 max-w-[180px] truncate" title={noteText}>
                        {noteText}
                      </TableCell>
                      <TableCell className="text-center">
                        <Link href={`/invoices/${inv.id}`}>
                          <Button variant="outline" size="sm" className="h-7 px-2 text-xs">
                            <Eye className="w-3.5 h-3.5 mr-1" /> Detail
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  )
                })}

                {filteredInvoices.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={16} className="text-center py-8 text-slate-400">
                      {searchTerm ? 'Tidak ada invoice yang cocok dengan pencarian.' : 'Belum ada data invoice yang tercatat.'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}