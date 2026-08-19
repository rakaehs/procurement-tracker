'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ArrowLeft, Trash2, FileText, ExternalLink, Download, CreditCard, Plus } from 'lucide-react'
import Link from 'next/link'

export default function DetailInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const invoiceId = resolvedParams.id
  const router = useRouter()
  const supabase = createClient()

  const [invoice, setInvoice] = useState<any>(null)
  const [payments, setPayments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // State Form Tambah Pembayaran / Cicilan
  const [isAddingPayment, setIsAddingPayment] = useState(false)
  const [referenceNumber, setReferenceNumber] = useState('')
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0])
  const [paymentAmountFormatted, setPaymentAmountFormatted] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('Transfer')
  const [paymentNotes, setPaymentNotes] = useState('')
  const [submittingPayment, setSubmittingPayment] = useState(false)

  // State Detail Berdasarkan Metode Pembayaran & File Bukti
  const [detailFields, setDetailFields] = useState<any>({})
  const [paymentFile, setPaymentFile] = useState<File | null>(null)

  // Helper pembersih path (Mencegah Duplikasi Bucket & 404 Error)
  const getCleanFilePath = (pathOrUrl: string, bucketName: string) => {
    if (!pathOrUrl) return ''
    let clean = pathOrUrl.startsWith('/') ? pathOrUrl.substring(1) : pathOrUrl
    
    const knownBuckets = ['invoice_documents', 'payment_documents', 'po_documents', 'documents', 'public']
    for (const b of knownBuckets) {
      if (clean.toLowerCase().startsWith(b.toLowerCase() + '/')) {
        clean = clean.substring(b.length + 1)
        break
      }
    }
    return clean
  }

  // Helper format angka input pembayaran
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

  const handlePaymentAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    const sanitized = val.replace(/[^0-9,]/g, '')
    setPaymentAmountFormatted(formatNumberInput(sanitized))
  }

  // Fetch Data Invoice, Relasi, dan Payments
  useEffect(() => {
    async function fetchInvoiceDetail() {
      if (!invoiceId) return
      setLoading(true)

      const { data: invData, error: invErr } = await supabase
        .from('invoices')
        .select(`
          *,
          purchase_orders (id, po_number, total_amount, vendor_id),
          projects (project_name),
          companies (company_name)
        `)
        .eq('id', invoiceId)
        .single()

      if (invErr || !invData) {
        console.error('Error fetching invoice:', invErr?.message)
        setLoading(false)
        return
      }

      setInvoice(invData)

      const { data: payData } = await supabase
        .from('payments')
        .select('*')
        .eq('invoice_id', invoiceId)
        .order('payment_date', { ascending: false })

      setPayments(payData || [])
      setLoading(false)
    }

    fetchInvoiceDetail()
  }, [invoiceId, supabase])

  // Fungsi Hapus Invoice
  const handleDeleteInvoice = async () => {
    if (!confirm('Apakah Anda yakin ingin menghapus invoice ini? Data pembayaran terkait juga akan terhapus.')) return

    const { error } = await supabase.from('invoices').delete().eq('id', invoiceId)
    if (error) {
      alert('Gagal menghapus invoice: ' + error.message)
    } else {
      alert('Invoice berhasil dihapus.')
      router.push('/invoices')
    }
  }

  // Fungsi Tambah Pembayaran / Cicilan baru
  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault()
    const amountNum = parseNumberInput(paymentAmountFormatted)
    if (!amountNum || amountNum <= 0) {
      return alert('Masukkan nominal pembayaran yang valid!')
    }

    setSubmittingPayment(true)

    try {
      let fileUrl = null

      if (paymentFile) {
        const fileExt = paymentFile.name.split('.').pop()
        const fileName = `pay_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`
        const { data: uploadData, error: uploadErr } = await supabase.storage
          .from('payment_documents')
          .upload(fileName, paymentFile)

        if (uploadErr) throw uploadErr
        fileUrl = uploadData.path
      }

      const paymentDetailsPayload = {
        ...detailFields,
        additionalNotes: paymentNotes || ''
      }

      const { error: payErr } = await supabase
        .from('payments')
        .insert({
          invoice_id: invoiceId,
          project_id: invoice.project_id || null,
          po_id: invoice.po_id || invoice.purchase_orders?.id || null,
          vendor_id: invoice.vendor_id || invoice.purchase_orders?.vendor_id || null,
          payment_date: paymentDate,
          amount: amountNum,
          payment_method: paymentMethod, 
          reference_number: referenceNumber || `REF-${Date.now().toString().slice(-6)}`,
          payment_details: paymentDetailsPayload,
          document_url: fileUrl
        })

      if (payErr) throw payErr

      const totalPaidSoFar = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0) + amountNum
      const invoiceTotal = Number(invoice.amount || 0)

      let newStatus = invoice.status
      if (totalPaidSoFar >= invoiceTotal) {
        newStatus = 'Paid'
      } else if (totalPaidSoFar > 0) {
        newStatus = 'Partial Paid'
      }

      await supabase
        .from('invoices')
        .update({ status: newStatus })
        .eq('id', invoiceId)

      alert('Pembayaran berhasil dicatat!')
      setIsAddingPayment(false)
      window.location.reload()
    } catch (err: any) {
      alert('Gagal mencatat pembayaran: ' + err.message)
      setSubmittingPayment(false)
    }
  }

  const handleDeletePayment = async (payId: string) => {
    if (!confirm('Hapus catatan pembayaran ini?')) return

    const { error } = await supabase.from('payments').delete().eq('id', payId)
    if (error) {
      alert('Gagal menghapus pembayaran: ' + error.message)
    } else {
      window.location.reload()
    }
  }

  // FUNGSI BUKA / LIHAT DOKUMEN (Dengan RLS & createSignedUrl)
  const handleOpenDocument = async (pathOrUrl: string, bucketName: string = 'invoice_documents') => {
    try {
      if (!pathOrUrl) return alert('Path dokumen tidak valid.')
      if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) {
        window.open(pathOrUrl, '_blank')
        return
      }

      const cleanPath = getCleanFilePath(pathOrUrl, bucketName)

      const { data, error } = await supabase.storage
        .from(bucketName)
        .createSignedUrl(cleanPath, 3600)

      if (error || !data?.signedUrl) {
        throw new Error(error?.message || 'Gagal mengakses file dari bucket.')
      }

      window.open(data.signedUrl, '_blank')
    } catch (err: any) {
      alert('Gagal membuka dokumen: ' + err.message)
    }
  }

  // FUNGSI UNDUH DOKUMEN (Dengan RLS & createSignedUrl)
  const handleDownloadDocument = async (pathOrUrl: string, bucketName: string = 'invoice_documents', filenamePrefix: string = 'Dokumen') => {
    try {
      if (!pathOrUrl) return alert('Path dokumen tidak valid.')
      let downloadUrl = pathOrUrl

      if (!pathOrUrl.startsWith('http://') && !pathOrUrl.startsWith('https://')) {
        const cleanPath = getCleanFilePath(pathOrUrl, bucketName)
        const { data, error } = await supabase.storage
          .from(bucketName)
          .createSignedUrl(cleanPath, 3600)

        if (error || !data?.signedUrl) return alert('Gagal mendapatkan URL akses file.')
        downloadUrl = data.signedUrl
      }

      const response = await fetch(downloadUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${filenamePrefix}_${Date.now()}`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (err: any) {
      alert('Gagal mengunduh dokumen: ' + err.message)
    }
  }

  // Render Form Detail Dinamis Berdasarkan Metode Pembayaran
  const renderMethodDetailInputs = () => {
    switch (paymentMethod) {
      case 'Transfer':
        return (
          <div className="space-y-3 p-3 bg-slate-50 border rounded-md text-xs">
            <span className="font-semibold text-slate-700 block">Detail Transfer Bank</span>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[11px]">Bank Pengirim</Label>
                <Input placeholder="Contoh: BCA" className="bg-white h-8 text-xs" onChange={(e) => setDetailFields({...detailFields, senderBank: e.target.value})} />
              </div>
              <div>
                <Label className="text-[11px]">No. Rekening Pengirim</Label>
                <Input placeholder="Contoh: 1234567890" className="bg-white h-8 text-xs" onChange={(e) => setDetailFields({...detailFields, senderAcc: e.target.value})} />
              </div>
              <div>
                <Label className="text-[11px]">Nama Penerima (Atas Nama)</Label>
                <Input placeholder="Contoh: PT Vendor Maju" className="bg-white h-8 text-xs" onChange={(e) => setDetailFields({...detailFields, receiverName: e.target.value})} />
              </div>
              <div>
                <Label className="text-[11px]">Bank Penerima</Label>
                <Input placeholder="Contoh: Mandiri" className="bg-white h-8 text-xs" onChange={(e) => setDetailFields({...detailFields, receiverBank: e.target.value})} />
              </div>
              <div className="col-span-2">
                <Label className="text-[11px]">No. Rekening Penerima</Label>
                <Input placeholder="Contoh: 0987654321" className="bg-white h-8 text-xs" onChange={(e) => setDetailFields({...detailFields, receiverAcc: e.target.value})} />
              </div>
            </div>
          </div>
        )
      case 'Cash':
        return (
          <div className="space-y-3 p-3 bg-slate-50 border rounded-md text-xs">
            <span className="font-semibold text-slate-700 block">Detail Pembayaran Tunai (Cash)</span>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[11px]">Dibayarkan Oleh</Label>
                <Input placeholder="Nama / Bagian Kasir" className="bg-white h-8 text-xs" onChange={(e) => setDetailFields({...detailFields, paidBy: e.target.value})} />
              </div>
              <div>
                <Label className="text-[11px]">Diterima Oleh</Label>
                <Input placeholder="Nama Penerima Cash" className="bg-white h-8 text-xs" onChange={(e) => setDetailFields({...detailFields, paidTo: e.target.value})} />
              </div>
            </div>
          </div>
        )
      case 'Giro':
        return (
          <div className="space-y-3 p-3 bg-slate-50 border rounded-md text-xs">
            <span className="font-semibold text-slate-700 block">Detail Giro / Cheque</span>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[11px]">Nomor Giro / Cheque</Label>
                <Input placeholder="Contoh: GR-998877" className="bg-white h-8 text-xs" onChange={(e) => setDetailFields({...detailFields, giroNo: e.target.value})} />
              </div>
              <div>
                <Label className="text-[11px]">Bank Penerbit Giro</Label>
                <Input placeholder="Contoh: BNI" className="bg-white h-8 text-xs" onChange={(e) => setDetailFields({...detailFields, giroBank: e.target.value})} />
              </div>
              <div>
                <Label className="text-[11px]">Tanggal Jatuh Tempo Giro</Label>
                <Input type="date" className="bg-white h-8 text-xs" onChange={(e) => setDetailFields({...detailFields, giroDueDate: e.target.value})} />
              </div>
              <div>
                <Label className="text-[11px]">Penerima Giro</Label>
                <Input placeholder="Nama Penerima Giro" className="bg-white h-8 text-xs" onChange={(e) => setDetailFields({...detailFields, giroReceiver: e.target.value})} />
              </div>
            </div>
          </div>
        )
      default:
        return null
    }
  }

  if (loading) return <div className="p-10 text-center text-slate-500">Memuat detail invoice...</div>
  if (!invoice) return <div className="p-10 text-center text-red-500">Data invoice tidak ditemukan.</div>

  const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0)
  const remainingBalance = Number(invoice.amount || 0) - totalPaid

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 pb-24">
      
      <div className="flex justify-between items-center">
        <Link href="/invoices">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" /> Kembali
          </Button>
        </Link>
        <Button variant="destructive" size="sm" onClick={handleDeleteInvoice}>
          <Trash2 className="w-4 h-4 mr-2" /> Hapus Invoice
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <FileText className="w-8 h-8 text-blue-600" />
        <div>
          <h1 className="text-2xl font-bold">Invoice: {invoice.invoice_number}</h1>
          <p className="text-xs text-slate-500">Terikat pada PO: <strong>{invoice.purchase_orders?.po_number || '-'}</strong></p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Informasi Utama Invoice */}
        <Card>
          <CardHeader><CardTitle className="text-base">Informasi Tagihan</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between border-b pb-2">
              <span className="text-slate-500">Nomor Invoice</span>
              <span className="font-semibold">{invoice.invoice_number}</span>
            </div>
            
            <div className="flex justify-between border-b pb-2 items-center">
              <span className="text-slate-500">Jenis Tagihan</span>
              <span className="px-2 py-0.5 text-xs font-semibold rounded bg-slate-100 text-slate-700 border">
                {invoice.billing_type || 'Termin'}
              </span>
            </div>

            <div className="flex justify-between border-b pb-2">
              <span className="text-slate-500">Penerima Pembayaran</span>
              <span className="font-semibold text-slate-800">{invoice.recipient_name || '-'}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-slate-500">Tanggal Invoice</span>
              <span>{invoice.invoice_date || '-'}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-slate-500">Jatuh Tempo (Due Date)</span>
              <span className="font-medium text-amber-600">{invoice.due_date || '-'}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-slate-500">Company</span>
              <span className="font-medium">{invoice.companies?.company_name || '-'}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-slate-500">Project</span>
              <span className="font-medium">{invoice.projects?.project_name || '-'}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-slate-500">Status Invoice</span>
              <span className="px-2 py-0.5 text-xs font-semibold rounded bg-blue-100 text-blue-700">
                {invoice.status || 'Invoice Received'}
              </span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-slate-500">Catatan</span>
              <span className="font-medium text-slate-700">{invoice.notes && invoice.notes.trim() !== '' ? invoice.notes : '-'}</span>
            </div>
            <div className="flex justify-between items-center pt-2">
              <span className="text-slate-500">Dokumen Fisik</span>
              {invoice.document_url ? (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleOpenDocument(invoice.document_url, 'invoice_documents')}>
                    <FileText className="w-4 h-4 mr-1.5" /> Lihat <ExternalLink className="w-3 h-3 ml-1" />
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => handleDownloadDocument(invoice.document_url, 'invoice_documents', `Invoice_${invoice.invoice_number}`)}>
                    <Download className="w-4 h-4 mr-1.5" /> Unduh
                  </Button>
                </div>
              ) : <span className="text-xs text-slate-400">Tidak ada lampiran</span>}
            </div>
          </CardContent>
        </Card>

        {/* Ringkasan Finansial Invoice */}
        <Card className="bg-slate-50/50 flex flex-col justify-between">
          <div>
            <CardHeader><CardTitle className="text-base">Ringkasan Pembayaran</CardTitle></CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="bg-white p-4 rounded-lg border shadow-sm space-y-2">
                <div className="flex justify-between text-slate-600">
                  <span>Total Nominal Tagihan:</span>
                  <span className="font-bold text-slate-900">Rp {Number(invoice.amount || 0).toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Sudah Dibayar (Total Paid):</span>
                  <span className="font-semibold text-emerald-600">Rp {totalPaid.toLocaleString('id-ID')}</span>
                </div>
                <div className="border-t pt-2 flex justify-between font-bold text-base">
                  <span>Sisa Kurang Bayar:</span>
                  <span className={remainingBalance > 0 ? 'text-amber-600' : 'text-slate-600'}>
                    Rp {remainingBalance.toLocaleString('id-ID')}
                  </span>
                </div>
              </div>
            </CardContent>
          </div>
          <div className="p-6 pt-0">
            <Button 
              className="w-full bg-slate-900 hover:bg-slate-800 text-white" 
              onClick={() => setIsAddingPayment(true)}
            >
              <Plus className="w-4 h-4 mr-2" /> Catat Pembayaran / Cicilan Baru
            </Button>
          </div>
        </Card>
      </div>

      {/* MODAL FORM TAMBAH PEMBAYARAN */}
      <Dialog open={isAddingPayment} onOpenChange={setIsAddingPayment}>
        <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-blue-900">Form Pencatatan Pembayaran</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddPayment} className="space-y-4 pt-2">
            <div className="space-y-3">
              <div>
                <Label>No. Referensi / Bukti Bayar</Label>
                <Input 
                  placeholder="Contoh: REF-001" 
                  value={referenceNumber} 
                  onChange={(e) => setReferenceNumber(e.target.value)} 
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Tanggal Bayar *</Label>
                  <Input 
                    type="date" 
                    value={paymentDate} 
                    onChange={(e) => setPaymentDate(e.target.value)} 
                    required 
                  />
                </div>
                <div>
                  <Label>Metode Pembayaran</Label>
                  <select 
                    className="w-full border rounded-md px-3 py-2 text-sm bg-white h-10"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  >
                    <option value="Transfer">Transfer Bank</option>
                    <option value="Cash">Cash / Tunai</option>
                    <option value="Giro">Giro / Cheque</option>
                  </select>
                </div>
              </div>

              {renderMethodDetailInputs()}

              <div>
                <Label>Nominal Pembayaran (Rp) *</Label>
                <Input 
                  type="text" 
                  placeholder="Contoh: 15.000.000" 
                  value={paymentAmountFormatted} 
                  onChange={handlePaymentAmountChange} 
                  required 
                />
              </div>

              <div>
                <Label>Lampirkan Bukti Pembayaran (PDF / Gambar)</Label>
                <Input 
                  type="file" 
                  onChange={(e) => setPaymentFile(e.target.files?.[0] || null)} 
                  className="cursor-pointer text-xs" 
                />
              </div>

              <div>
                <Label>Catatan / Keterangan Tambahan</Label>
                <Input 
                  placeholder="Misal: Pembayaran Termin 1 / Cicilan ke-2..." 
                  value={paymentNotes} 
                  onChange={(e) => setPaymentNotes(e.target.value)} 
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setIsAddingPayment(false)}>Batal</Button>
              <Button type="submit" disabled={submittingPayment}>
                {submittingPayment ? 'Menyimpan...' : 'Simpan Pembayaran'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* TABEL RIWAYAT PEMBAYARAN / CICILAN */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-emerald-600" /> Riwayat Pembayaran / Cicilan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="w-12 text-center">No</TableHead>
                <TableHead>No. Referensi</TableHead>
                <TableHead>Tanggal Bayar</TableHead>
                <TableHead>Metode</TableHead>
                <TableHead>Detail Pembayaran & Catatan</TableHead>
                <TableHead className="text-right">Nominal Bayar</TableHead>
                <TableHead className="text-center">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((pay, idx) => (
                <TableRow key={pay.id}>
                  <TableCell className="text-center">{idx + 1}</TableCell>
                  <TableCell className="font-semibold">{pay.reference_number || '-'}</TableCell>
                  <TableCell>{pay.payment_date || '-'}</TableCell>
                  <TableCell>
                    <span className="px-2 py-1 bg-slate-100 rounded text-xs font-semibold text-slate-700">
                      {pay.payment_method || '-'}
                    </span>
                  </TableCell>
                  <TableCell className="text-slate-700 text-xs space-y-1 py-3">
                    {pay.payment_details ? (
                      <div className="space-y-0.5 text-slate-600">
                        {pay.payment_method === 'Transfer' && (
                          <>
                            <div>• Bank Pengirim: <strong>{pay.payment_details.senderBank || '-'}</strong> ({pay.payment_details.senderAcc || '-'})</div>
                            <div>• Penerima: <strong>{pay.payment_details.receiverName || '-'}</strong> - {pay.payment_details.receiverBank || '-'} ({pay.payment_details.receiverAcc || '-'})</div>
                          </>
                        )}

                        {pay.payment_method === 'Cash' && (
                          <>
                            <div>• Dibayar Oleh: <strong>{pay.payment_details.paidBy || '-'}</strong></div>
                            <div>• Diterima Oleh: <strong>{pay.payment_details.paidTo || '-'}</strong></div>
                          </>
                        )}

                        {pay.payment_method === 'Giro' && (
                          <>
                            <div>• No. Giro: <strong>{pay.payment_details.giroNo || '-'}</strong> ({pay.payment_details.giroBank || '-'})</div>
                            <div>• Jatuh Tempo: {pay.payment_details.giroDueDate || '-'} | Penerima: {pay.payment_details.giroReceiver || '-'}</div>
                          </>
                        )}

                        {pay.payment_details.additionalNotes && (
                          <div className="italic text-slate-500 pt-0.5">• Catatan: {pay.payment_details.additionalNotes}</div>
                        )}
                      </div>
                    ) : '-'}

                    {pay.document_url && (
                      <div className="flex gap-2 pt-2">
                        <button 
                          type="button"
                          onClick={() => handleOpenDocument(pay.document_url, 'payment_documents')}
                          className="text-[11px] text-blue-600 hover:underline flex items-center gap-1 font-medium bg-blue-50 px-2 py-0.5 rounded w-fit border border-blue-200"
                        >
                          <FileText className="w-3 h-3" /> Lihat
                        </button>
                        <button 
                          type="button"
                          onClick={() => handleDownloadDocument(pay.document_url, 'payment_documents', `Bukti_Bayar_${pay.reference_number}`)}
                          className="text-[11px] text-emerald-600 hover:underline flex items-center gap-1 font-medium bg-emerald-50 px-2 py-0.5 rounded w-fit border border-emerald-200"
                        >
                          <Download className="w-3 h-3" /> Download
                        </button>
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-medium text-emerald-600">
                    Rp {Number(pay.amount || 0).toLocaleString('id-ID')}
                  </TableCell>
                  <TableCell className="text-center">
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      className="h-7 w-7 p-0" 
                      onClick={() => handleDeletePayment(pay.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}

              {payments.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-6 text-slate-400">
                    Belum ada riwayat pembayaran / cicilan untuk invoice ini.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}