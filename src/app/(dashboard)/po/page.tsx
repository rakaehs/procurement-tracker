'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Plus, Eye, Search, RefreshCcw } from 'lucide-react'
import Link from 'next/link'

export default function POIndexPage() {
  const supabase = createClient()
  const [poList, setPoList] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [searchQuery, setSearchQuery] = useState('')
  const [filterBy, setFilterBy] = useState('')
  const [vendorsList, setVendorsList] = useState<any[]>([])

  const fetchPOs = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('purchase_orders')
      .select(`
        *,
        vendors (vendor_name),
        purchase_requests (
          pr_number,
          projects (
            project_name,
            customers (instansi_name)
          ),
          companies (company_name)
        )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching POs:', error.message)
    } else {
      setPoList(data || [])
    }
    setLoading(false)
  }

  const fetchVendors = async () => {
    const { data } = await supabase.from('vendors').select('id, vendor_name')
    if (data) setVendorsList(data)
  }

  useEffect(() => {
    fetchPOs()
    fetchVendors()
  }, [supabase])

  const handleStatusUpdate = async (poId: string, newStatus: string) => {
    const { error } = await supabase
      .from('purchase_orders')
      .update({ status: newStatus })
      .eq('id', poId)

    if (error) {
      alert('Gagal merubah status PO: ' + error.message)
    } else {
      setPoList(prev => prev.map(po => po.id === poId ? { ...po, status: newStatus } : po))
    }
  }

  const filteredPOs = poList.filter((po) => {
    const poNum = po.po_number?.toLowerCase() || ''
    const poDate = po.po_date?.toLowerCase() || ''
    const status = po.status?.toLowerCase() || ''
    const vendorName = po.vendors?.vendor_name?.toLowerCase() || ''
    const projectName = po.purchase_requests?.projects?.project_name?.toLowerCase() || ''
    const customerName = po.purchase_requests?.projects?.customers?.instansi_name?.toLowerCase() || ''
    const companyName = po.purchase_requests?.companies?.company_name?.toLowerCase() || ''
    const query = searchQuery.toLowerCase()

    const matchesSearch = 
      poNum.includes(query) || 
      poDate.includes(query) ||
      status.includes(query) ||
      vendorName.includes(query) || 
      projectName.includes(query) || 
      customerName.includes(query) ||
      companyName.includes(query)

    let matchesFilter = true
    if (filterBy) {
      if (filterBy.startsWith('status_')) {
        const val = filterBy.replace('status_', '')
        matchesFilter = po.status === val
      } else if (filterBy.startsWith('vendor_')) {
        const val = filterBy.replace('vendor_', '')
        matchesFilter = String(po.vendor_id) === val
      }
    }

    return matchesSearch && matchesFilter
  })

  const handleResetFilter = () => {
    setSearchQuery('')
    setFilterBy('')
  }

  return (
    <div className="p-6 max-w-[95%] mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">Daftar Purchase Order (PO)</h1>
        <Link href="/po/add">
          <Button>
            <Plus className="w-4 h-4 mr-2" /> Buat PO Baru
          </Button>
        </Link>
      </div>

      <div className="bg-slate-50 p-4 rounded-lg border space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label className="text-xs font-semibold text-slate-600 uppercase">Search</Label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Cari berdasarkan data apa saja..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-white"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-semibold text-slate-600 uppercase">Filter by</Label>
            <select 
              className="w-full border rounded-md px-3 py-2 text-sm bg-white h-10"
              value={filterBy}
              onChange={(e) => setFilterBy(e.target.value)}
            >
              <option value="">Semua Data (Tanpa Filter)</option>
              
              <optgroup label="Berdasarkan Status">
                <option value="status_Released">Status: Released (Biru)</option>
                <option value="status_Sent">Status: Sent (Hijau)</option>
                <option value="status_Canceled">Status: Canceled (Merah)</option>
              </optgroup>

              <optgroup label="Berdasarkan Vendor">
                {vendorsList.map((v) => (
                  <option key={v.id} value={`vendor_${v.id}`}>Vendor: {v.vendor_name}</option>
                ))}
              </optgroup>
            </select>
          </div>
        </div>

        <div className="flex justify-between items-center pt-2 border-t">
          <div className="text-xs text-slate-500">
            Menampilkan <span className="font-semibold text-slate-800">{filteredPOs.length}</span> dari {poList.length} total data PO
          </div>
          <Button variant="outline" size="sm" onClick={handleResetFilter}>
            <RefreshCcw className="w-3.5 h-3.5 mr-1.5" /> Reset Filter
          </Button>
        </div>
      </div>

      <div className="border rounded-md bg-white overflow-x-auto shadow-sm">
        <Table>
          <TableHeader>
            <TableRow><TableHead className="w-12 text-center">No</TableHead><TableHead>Vendor</TableHead><TableHead>Nomor PO</TableHead><TableHead>Tanggal PO</TableHead><TableHead>Project</TableHead><TableHead>Customer</TableHead><TableHead>Company</TableHead><TableHead className="text-center">Status (Ubah Cepat)</TableHead><TableHead className="text-right">Total Amount</TableHead><TableHead className="text-center w-20">Actions</TableHead></TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={10} className="text-center py-8 text-slate-400">Memuat data...</TableCell></TableRow>
            ) : filteredPOs.length === 0 ? (
              <TableRow><TableCell colSpan={10} className="text-center py-8 text-slate-400">Tidak ada data Purchase Order yang sesuai.</TableCell></TableRow>
            ) : (
              filteredPOs.map((po, index) => {
                const customerName = po.purchase_requests?.projects?.customers?.instansi_name || '-'
                return (
                  <TableRow key={po.id}>
                    <TableCell className="text-center font-medium text-slate-500">{index + 1}</TableCell>
                    <TableCell className="font-semibold">{po.vendors?.vendor_name || '-'}</TableCell>
                    <TableCell>{po.po_number}</TableCell>
                    <TableCell>{po.po_date || '-'}</TableCell>
                    <TableCell>{po.purchase_requests?.projects?.project_name || '-'}</TableCell>
                    <TableCell>{customerName}</TableCell>
                    <TableCell>{po.purchase_requests?.companies?.company_name || '-'}</TableCell>
                    
                    <TableCell className="text-center">
                      <select
                        className={`text-xs font-semibold px-2.5 py-1 rounded-md border bg-white cursor-pointer transition-colors ${
                          po.status === 'Sent' ? 'text-emerald-700 border-emerald-300 bg-emerald-50' :
                          po.status === 'Canceled' ? 'text-red-700 border-red-300 bg-red-50' :
                          'text-blue-700 border-blue-300 bg-blue-50' // Released (Default)
                        }`}
                        value={po.status || 'Released'}
                        onChange={(e) => handleStatusUpdate(po.id, e.target.value)}
                      >
                        <option value="Released">Released</option>
                        <option value="Sent">Sent</option>
                        <option value="Canceled">Canceled</option>
                      </select>
                    </TableCell>

                    <TableCell className="text-right font-medium">
                      Rp {Number(po.total_amount || 0).toLocaleString('id-ID')}
                    </TableCell>
                    
                    <TableCell className="text-center">
                      <Link href={`/po/${po.id}`}>
                        <Button variant="ghost" size="icon" title="Lihat Detail"><Eye className="w-4 h-4 text-blue-600" /></Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}