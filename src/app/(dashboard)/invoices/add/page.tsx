'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ArrowLeft, Save, FileText, Package, ChevronDown, ChevronUp, Search } from 'lucide-react'
import Link from 'next/link'

export default function AddInvoicePage() {
  const router = useRouter()
  const supabase = createClient()

  // State untuk pencarian PO interaktif
  const [pos, setPos] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const [selectedPoId, setSelectedPoId] = useState('')
  const [selectedPoDetail, setSelectedPoDetail] = useState<any>(null)
  const [poItems, setPoItems] = useState<any[]>([])
  const [showPoDetails, setShowPoDetails] = useState(true)
  
  const [poStats, setPoStats] = useState({ totalPo: 0, alreadyInvoiced: 0, remaining: 0 })

  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [recipientName, setRecipientName] = useState('')
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0])
  const [dueDate, setDueDate] = useState('')
  const [amountFormatted, setAmountFormatted] = useState('')
  const [billingType, setBillingType] = useState('Termin')
  const [status, setStatus] = useState('Invoice Received')
  const [notes, setNotes] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)

  // Tutup dropdown jika klik di luar area komponen pencarian
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Helper format angka input (pemisah ribuan titik)
  const formatNumberInput = (val: string) => {
    if (!val) return ''
    const parts = val.split(',')
    let integerPart = parts[0].replace(/\D/g, '')
    const formattedInt = integerPart ? Number(integerPart).toLocaleString('id-ID') : ''
    if (val.includes(',')) {
      return `${formattedInt},${parts[1].replace(/\D/g, '')}`
    }
    if (val.endsWith(',')) return `${formattedInt},`
    return formattedInt
  }

  const parseNumberInput = (val: string) => {
    if (!val) return 0
    const clean = val.replace(/\./g, '').replace(',', '.')
    return parseFloat(clean) || 0
  }

  // Logika input nominal dengan pembatasan otomatis maksimal sebesar sisa PO
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    const sanitized = val.replace(/[^0-9,]/g, '')
    let numericVal = parseNumberInput(sanitized)

    if (selectedPoId && numericVal > poStats.remaining) {
      numericVal = poStats.remaining
    }

    setAmountFormatted(numericVal > 0 ? numericVal.toLocaleString('id-ID') : '')
  }

  // Fetch daftar PO
  useEffect(() => {
    async function fetchPOs() {
      let query = supabase
        .from('purchase_orders')
        .select(`
          id,
          po_number,
          po_date,
          total_amount,
          project_id,
          pr_id,
          vendor_id,
          vendors (id, vendor_name, email, phone),
          projects (id, project_name)
        `)
        .order('created_at', { ascending: false })
        .limit(20)

      if (searchTerm.trim() !== '') {
        query = query.ilike('po_number', `%${searchTerm}%`)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetch POs:', error.message)
      } else {
        setPos(data || [])
      }
    }
    fetchPOs()
  }, [supabase, searchTerm])

  const handleSelectPo = async (po: any) => {
    setSelectedPoId(po.id)
    setSelectedPoDetail(po)
    setSearchTerm(po.po_number)
    setIsDropdownOpen(false)

    if (po?.vendors?.vendor_name) {
      setRecipientName(po.vendors.vendor_name)
    }

    const totalPoAmount = Number(po?.total_amount || 0)

    const { data: itemsData } = await supabase
      .from('purchase_order_items')
      .select('*')
      .eq('po_id', po.id)

    setPoItems(itemsData || [])

    const { data: existingInvoices } = await supabase
      .from('invoices')
      .select('amount')
      .eq('po_id', po.id)

    const totalInvoicedBefore = (existingInvoices || []).reduce((sum, inv) => sum + Number(inv.amount || 0), 0)
    const remainingBalance = totalPoAmount - totalInvoicedBefore

    setPoStats({
      totalPo: totalPoAmount,
      alreadyInvoiced: totalInvoicedBefore,
      remaining: remainingBalance
    })
    
    setAmountFormatted('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPoId) return alert('Pilih PO terlebih dahulu!')
    if (!invoiceNumber.trim()) return alert('Nomor invoice wajib diisi!')
    if (!recipientName.trim()) return alert('Nama penerima pembayaran wajib diisi!')

    const parsedAmount = parseNumberInput(amountFormatted)
    if (!parsedAmount || parsedAmount <= 0) return alert('Masukkan nominal tagihan yang valid!')

    setLoading(true)

    try {
      let projectId = selectedPoDetail?.project_id || null
      let companyId = null
      
      const vendorIdKey = selectedPoDetail?.vendor_id || selectedPoDetail?.vendors?.id || null

      if (selectedPoDetail?.pr_id) {
        const { data: prData } = await supabase
          .from('purchase_requests')
          .select('company_id, project_id')
          .eq('id', selectedPoDetail.pr_id)
          .single()

        if (prData) {
          companyId = prData.company_id || null
          if (!projectId) projectId = prData.project_id || null
        }
      }

      let fileUrl = null
      if (file) {
        const fileExt = file.name.split('.').pop()
        const fileName = `inv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`
        const { data: uploadData, error: uploadErr } = await supabase.storage
          .from('invoice_documents')
          .upload(fileName, file)

        if (uploadErr) throw uploadErr
        
        // Disimpan sebagai path murni di dalam bucket invoice_documents
        fileUrl = uploadData.path 
      }

      const { error: insertErr } = await supabase
        .from('invoices')
        .insert({
          po_id: selectedPoId,
          project_id: projectId,
          company_id: companyId,
          vendor_id: vendorIdKey,
          invoice_number: invoiceNumber,
          recipient_name: recipientName,
          billing_type: billingType,
          invoice_date: invoiceDate || null,
          due_date: dueDate || null,
          amount: parsedAmount,
          status: status,
          document_url: fileUrl,
          notes: notes.trim()
        })

      if (insertErr) throw insertErr

      alert('Invoice berhasil ditambahkan!')
      router.push('/invoices')
    } catch (err: any) {
      alert('Gagal menambah invoice: ' + err.message)
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 pb-24">
      <div className="flex justify-between items-center">
        <Link href="/invoices">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" /> Kembali ke Daftar Invoice
          </Button>
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Tambah Invoice Vendor</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" /> Form Input Tagihan (Invoice) & Verifikasi PO
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            
            <div className="space-y-2 relative" ref={dropdownRef}>
              <Label>Cari & Pilih Purchase Order (PO) *</Label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <Input 
                  placeholder="Ketik nomor PO untuk mencari..." 
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value)
                    setIsDropdownOpen(true)
                  }}
                  onFocus={() => setIsDropdownOpen(true)}
                  className="pl-9"
                />
              </div>

              {isDropdownOpen && (
                <div className="absolute z-20 w-full bg-white border border-slate-200 rounded-md shadow-lg max-h-60 overflow-y-auto mt-1">
                  {pos.map(po => (
                    <div 
                      key={po.id} 
                      className="p-3 hover:bg-slate-50 cursor-pointer border-b text-xs flex justify-between items-center"
                      onClick={() => handleSelectPo(po)}
                    >
                      <div>
                        <strong className="text-blue-600 text-sm">PO: {po.po_number}</strong>
                        <div className="text-slate-500">Vendor: {po.vendors?.vendor_name || '-'} | Project: {po.projects?.project_name || '-'}</div>
                      </div>
                      <span className="font-semibold text-slate-700">Rp {Number(po.total_amount || 0).toLocaleString('id-ID')}</span>
                    </div>
                  ))}
                  {pos.length === 0 && (
                    <div className="p-4 text-center text-xs text-slate-400">Nomor PO tidak ditemukan.</div>
                  )}
                </div>
              )}
            </div>

            {selectedPoId && selectedPoDetail && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4 shadow-sm">
                <div className="flex justify-between items-center cursor-pointer" onClick={() => setShowPoDetails(!showPoDetails)}>
                  <div className="flex items-center gap-2 text-slate-800 font-semibold text-sm">
                    <Package className="w-4 h-4 text-blue-600" />
                    <span>Verifikasi Data PO: <strong className="text-blue-700">#{selectedPoDetail.po_number}</strong></span>
                  </div>
                  <Button type="button" variant="ghost" size="sm" className="h-7 text-xs text-slate-500">
                    {showPoDetails ? <ChevronUp className="w-4 h-4 mr-1" /> : <ChevronDown className="w-4 h-4 mr-1" />}
                    {showPoDetails ? 'Sembunyikan Detail' : 'Tampilkan Detail PO'}
                  </Button>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="bg-white p-2.5 rounded-lg border shadow-xs">
                    <span className="text-slate-400 block text-[11px]">Total Nilai PO</span>
                    <strong className="text-slate-800 text-sm">Rp {poStats.totalPo.toLocaleString('id-ID')}</strong>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border shadow-xs">
                    <span className="text-slate-400 block text-[11px]">Sudah Tertagih</span>
                    <strong className="text-blue-600 text-sm">Rp {poStats.alreadyInvoiced.toLocaleString('id-ID')}</strong>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border shadow-xs">
                    <span className="text-slate-400 block text-[11px]">Belum Tertagih (Maksimal)</span>
                    <strong className={`text-sm ${poStats.remaining > 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                      Rp {poStats.remaining.toLocaleString('id-ID')}
                    </strong>
                  </div>
                </div>

                {showPoDetails && (
                  <div className="space-y-3 pt-2 border-t border-slate-200 text-xs">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 bg-white p-3 rounded-lg border text-slate-600">
                      <div>
                        <span className="text-slate-400 block">Vendor:</span>
                        <strong className="text-slate-800">{selectedPoDetail.vendors?.vendor_name || '-'}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Project:</span>
                        <strong className="text-slate-800">{selectedPoDetail.projects?.project_name || '-'}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Tanggal PO:</span>
                        <strong className="text-slate-800">{selectedPoDetail.po_date || '-'}</strong>
                      </div>
                    </div>

                    <div>
                      <span className="font-semibold text-slate-700 block mb-1">Daftar Barang Dipesan dalam PO Ini:</span>
                      <div className="border rounded-lg bg-white overflow-hidden max-h-44 overflow-y-auto">
                        <Table>
                          <TableHeader className="bg-slate-100">
                            <TableRow>
                              <TableHead className="w-10 text-center py-2">No</TableHead>
                              <TableHead className="py-2">Nama Barang</TableHead>
                              <TableHead className="text-center py-2">Qty</TableHead>
                              <TableHead className="text-right py-2">Harga Satuan</TableHead>
                              <TableHead className="text-right py-2">Subtotal</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {poItems.map((item, idx) => (
                              <TableRow key={item.id || idx}>
                                <TableCell className="text-center py-1.5">{idx + 1}</TableCell>
                                <TableCell className="font-medium py-1.5">{item.item_name} {item.brand ? `(${item.brand})` : ''}</TableCell>
                                <TableCell className="text-center py-1.5">{item.quantity} {item.unit || ''}</TableCell>
                                <TableCell className="text-right py-1.5">Rp {Number(item.unit_price || 0).toLocaleString('id-ID')}</TableCell>
                                <TableCell className="text-right font-medium py-1.5">Rp {Number(item.subtotal || 0).toLocaleString('id-ID')}</TableCell>
                              </TableRow>
                            ))}
                            {poItems.length === 0 && (
                              <TableRow>
                                <TableCell colSpan={5} className="text-center py-3 text-slate-400">Tidak ada item barang.</TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t">
              <div className="space-y-2">
                <Label>Nomor Invoice *</Label>
                <Input 
                  placeholder="Contoh: INV/2026/001" 
                  value={invoiceNumber} 
                  onChange={(e) => setInvoiceNumber(e.target.value)} 
                  required 
                />
              </div>

              <div className="space-y-2">
                <Label>Nama Penerima Pembayaran (Atas Nama / Rekening) *</Label>
                <Input 
                  placeholder="Contoh: PT Vendor Sejahtera / Bank BCA a.n..." 
                  value={recipientName} 
                  onChange={(e) => setRecipientName(e.target.value)} 
                  required 
                />
              </div>

              <div className="space-y-2">
                <Label>Jenis Tagihan / Termin</Label>
                <select 
                  className="w-full border rounded-md px-3 py-2 text-sm bg-white h-10"
                  value={billingType}
                  onChange={(e) => setBillingType(e.target.value)}
                >
                  <option value="DP (Uang Muka)">DP (Uang Muka)</option>
                  <option value="Termin">Termin</option>
                  <option value="Full Payment">Full Payment</option>
                  <option value="Cicilan">Cicilan</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label>Status Awal</Label>
                <select 
                  className="w-full border rounded-md px-3 py-2 text-sm bg-white h-10"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="Invoice Received">Invoice Received</option>
                  <option value="Submit To Finance">Submit To Finance</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label>Tanggal Invoice</Label>
                <Input 
                  type="date" 
                  value={invoiceDate} 
                  onChange={(e) => setInvoiceDate(e.target.value)} 
                />
              </div>

              <div className="space-y-2">
                <Label>Tanggal Jatuh Tempo (Due Date)</Label>
                <Input 
                  type="date" 
                  value={dueDate} 
                  onChange={(e) => setDueDate(e.target.value)} 
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>
                  Nominal Tagihan (Rp) * 
                  {selectedPoId && <span className="text-xs text-slate-500 font-normal ml-2">(Maksimal: Rp {poStats.remaining.toLocaleString('id-ID')})</span>}
                </Label>
                <Input 
                  type="text" 
                  placeholder="Contoh: 50.000.000" 
                  value={amountFormatted} 
                  onChange={handleAmountChange} 
                  required 
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>Dokumen Fisik Invoice (PDF/Img)</Label>
                <Input 
                  type="file" 
                  onChange={(e) => setFile(e.target.files?.[0] || null)} 
                  className="cursor-pointer text-xs" 
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>Catatan / Keterangan</Label>
                <Input 
                  placeholder="Misal: Tagihan Termin 1 proyek..." 
                  value={notes} 
                  onChange={(e) => setNotes(e.target.value)} 
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Link href="/invoices">
                <Button type="button" variant="outline">Batal</Button>
              </Link>
              <Button type="submit" disabled={loading}>
                <Save className="w-4 h-4 mr-2" /> {loading ? 'Menyimpan...' : 'Simpan Invoice'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}