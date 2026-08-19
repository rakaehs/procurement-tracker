'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ArrowLeft, Package, FileText, CreditCard, Eye, AlertCircle, Download } from 'lucide-react'
import Link from 'next/link'

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const projectId = resolvedParams.id
  const router = useRouter()
  const supabase = createClient()

  const [project, setProject] = useState<any>(null)
  const [customer, setCustomer] = useState<any>(null)
  const [company, setCompany] = useState<any>(null)
  const [internalPic, setInternalPic] = useState<string>('-')
  const [pos, setPos] = useState<any[]>([])
  const [invoices, setInvoices] = useState<any[]>([])
  const [payments, setPayments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Fungsi untuk membuka dokumen bukti bayar secara aman menggunakan signed URL
  const handleOpenDocument = async (pathOrUrl: string, bucketName: string = 'payment_documents') => {
    try {
      if (!pathOrUrl) return alert('Path dokumen tidak valid.')
      if (pathOrUrl.startsWith('http')) {
        window.open(pathOrUrl, '_blank')
        return
      }

      const { data, error } = await supabase.storage
        .from(bucketName)
        .createSignedUrl(pathOrUrl, 60)

      if (error || !data?.signedUrl) {
        throw new Error(error?.message || 'Gagal membuat tautan dokumen.')
      }

      window.open(data.signedUrl, '_blank')
    } catch (err: any) {
      alert('Gagal membuka dokumen: ' + err.message)
    }
  }

  // Fungsi untuk mendownload dokumen bukti bayar
  const handleDownloadDocument = async (pathOrUrl: string, bucketName: string = 'payment_documents') => {
    try {
      if (!pathOrUrl) return alert('Path dokumen tidak valid.')
      let fileUrl = pathOrUrl
      if (!pathOrUrl.startsWith('http')) {
        const { data, error } = await supabase.storage.from(bucketName).createSignedUrl(pathOrUrl, 60)
        if (error || !data?.signedUrl) return alert('Gagal mendapatkan URL dokumen.')
        fileUrl = data.signedUrl
      }

      const response = await fetch(fileUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Bukti_Bayar_${Date.now()}`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      alert('Gagal mengunduh dokumen.')
    }
  }

  useEffect(() => {
    async function fetchProjectDetail() {
      if (!projectId) return
      setLoading(true)

      // 1. Ambil data project utama
      const { data: projData, error: projErr } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .maybeSingle()

      if (projErr || !projData) {
        alert('Project tidak ditemukan')
        router.push('/projects')
        return
      }
      setProject(projData)

      let pic = projData.internal_pic || projData.pic_internal || ''

      // 2. Ambil data Customer & Company pendukung
      if (projData.customer_id) {
        const { data: custData } = await supabase.from('customers').select('*').eq('id', projData.customer_id).maybeSingle()
        setCustomer(custData)
      }
      if (projData.company_id) {
        const { data: compData } = await supabase.from('companies').select('*').eq('id', projData.company_id).maybeSingle()
        setCompany(compData)
      }

      // 3. Ambil data Purchase Request (PR) untuk fallback PIC jika kosong
      const { data: prs } = await supabase.from('purchase_requests').select('*').eq('project_id', projectId)
      const prIds = prs ? prs.map(p => p.id) : []

      if (!pic && prs && prs.length > 0) {
        pic = prs[0].pic_internal || '-'
      }
      setInternalPic(pic || '-')

      // 4. Ambil data Purchase Order (PO)
      let poQuery = supabase.from('purchase_orders').select('*, vendors(vendor_name)')
      if (prIds.length > 0) {
        poQuery = poQuery.or(`project_id.eq.${projectId},pr_id.in.(${prIds.join(',')})`)
      } else {
        poQuery = poQuery.eq('project_id', projectId)
      }
      const { data: poData } = await poQuery
      setPos(poData || [])
      const poIds = poData ? poData.map(p => p.id) : []

      // 5. Ambil data Invoice
      let invQuery = supabase.from('invoices').select('*')
      if (poIds.length > 0) {
        invQuery = invQuery.or(`project_id.eq.${projectId},po_id.in.(${poIds.join(',')})`)
      } else {
        invQuery = invQuery.eq('project_id', projectId)
      }
      const { data: invData } = await invQuery
      setInvoices(invData || [])
      const invIds = invData ? invData.map(i => i.id) : []

      // 6. Ambil data Payment
      let payQuery = supabase.from('payments').select('*')
      if (invIds.length > 0) {
        payQuery = payQuery.or(`project_id.eq.${projectId},invoice_id.in.(${invIds.join(',')})`)
      } else {
        payQuery = payQuery.eq('project_id', projectId)
      }
      const { data: payData } = await payQuery
      setPayments(payData || [])

      setLoading(false)
    }

    fetchProjectDetail()
  }, [projectId, router, supabase])

  if (loading) return <div className="p-10 text-center text-slate-500">Memuat detail project...</div>
  if (!project) return <div className="p-10 text-center text-red-500">Project tidak ditemukan.</div>

  const customerName = customer?.instansi_name || customer?.customer_name || customer?.name || '-'
  const companyName = company?.company_name || company?.name || '-'

  // Perhitungan Total Nominal
  const totalPoAmount = pos.reduce((sum, item) => sum + Number(item.total_amount || 0), 0)
  const totalInvoiceAmount = invoices.reduce((sum, item) => sum + Number(item.amount || item.total_amount || 0), 0)
  const totalPaymentAmount = payments.reduce((sum, item) => sum + Number(item.amount || 0), 0)
  const totalOutstandingAmount = Math.max(0, totalInvoiceAmount - totalPaymentAmount)

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <Link href="/projects">
        <Button variant="outline" size="sm"><ArrowLeft className="w-4 h-4 mr-2" /> Kembali ke Daftar Project</Button>
      </Link>

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Detail Project: {project.project_name}</h1>
        </div>
      </div>

      {/* Ringkasan Informasi Project */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-slate-500">Customer</CardTitle></CardHeader>
          <CardContent><div className="text-lg font-semibold">{customerName}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-slate-500">Company</CardTitle></CardHeader>
          <CardContent><div className="text-lg font-semibold">{companyName}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-slate-500">Internal PIC</CardTitle></CardHeader>
          <CardContent><div className="text-lg font-semibold">{internalPic}</div></CardContent>
        </Card>
      </div>

      {/* Statistik Ringkas / Counter 4 Kolom */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card PO */}
        <Card className="bg-blue-50/50 border-blue-200">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-blue-600 uppercase">TOTAL PURCHASE ORDER</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-bold text-blue-900">{pos.length}</span>
                <span className="text-xs text-blue-700 font-medium">PO</span>
              </div>
              <p className="text-sm font-semibold text-blue-800 mt-1">
                Rp {totalPoAmount.toLocaleString('id-ID')}
              </p>
            </div>
            <Package className="w-10 h-10 text-blue-500" />
          </CardContent>
        </Card>

        {/* Card Invoice */}
        <Card className="bg-amber-50/50 border-amber-200">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-amber-600 uppercase">TOTAL INVOICE</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-bold text-amber-900">{invoices.length}</span>
                <span className="text-xs text-amber-700 font-medium">Invoice</span>
              </div>
              <p className="text-sm font-semibold text-amber-800 mt-1">
                Rp {totalInvoiceAmount.toLocaleString('id-ID')}
              </p>
            </div>
            <FileText className="w-10 h-10 text-amber-500" />
          </CardContent>
        </Card>

        {/* Card Payment */}
        <Card className="bg-emerald-50/50 border-emerald-200">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-emerald-600 uppercase">TOTAL PAYMENT</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-bold text-emerald-900">{payments.length}</span>
                <span className="text-xs text-emerald-700 font-medium">Transaksi</span>
              </div>
              <p className="text-sm font-semibold text-emerald-800 mt-1">
                Rp {totalPaymentAmount.toLocaleString('id-ID')}
              </p>
            </div>
            <CreditCard className="w-10 h-10 text-emerald-500" />
          </CardContent>
        </Card>

        {/* Card Outstanding */}
        <Card className="bg-rose-50/50 border-rose-200">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-rose-600 uppercase">TOTAL OUTSTANDING</p>
              <div className="mt-2">
                <span className="text-xl font-bold text-rose-900">
                  Rp {totalOutstandingAmount.toLocaleString('id-ID')}
                </span>
              </div>
              <p className="text-xs text-rose-700 mt-1">Sisa belum lunas</p>
            </div>
            <AlertCircle className="w-10 h-10 text-rose-500" />
          </CardContent>
        </Card>
      </div>

      {/* Tabel PO Terkait */}
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Package className="w-5 h-5 text-blue-600"/> Daftar Purchase Order (PO)</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead>No</TableHead>
                <TableHead>Nomor PO</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total Amount</TableHead>
                <TableHead className="text-center">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pos.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center text-slate-400 py-4">Belum ada PO untuk project ini.</TableCell></TableRow>
              ) : (
                pos.map((po, idx) => (
                  <TableRow key={po.id}>
                    <TableCell>{idx + 1}</TableCell>
                    <TableCell className="font-semibold">{po.po_number}</TableCell>
                    <TableCell>{po.vendors?.vendor_name || '-'}</TableCell>
                    <TableCell>{po.po_date || '-'}</TableCell>
                    <TableCell><span className="text-xs font-medium px-2 py-1 bg-slate-100 rounded-md">{po.status}</span></TableCell>
                    <TableCell className="text-right font-medium">Rp {Number(po.total_amount || 0).toLocaleString('id-ID')}</TableCell>
                    <TableCell className="text-center">
                      <Link href={`/po/${po.id}`}>
                        <Button variant="ghost" size="icon" title="Lihat Detail PO"><Eye className="w-4 h-4 text-blue-600"/></Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Tabel Invoice Terkait */}
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><FileText className="w-5 h-5 text-amber-600"/> Daftar Invoice</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead>No</TableHead>
                <TableHead>Nomor Invoice</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-center">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center text-slate-400 py-4">Belum ada Invoice untuk project ini.</TableCell></TableRow>
              ) : (
                invoices.map((inv, idx) => {
                  const associatedPo = pos.find(p => p.id === inv.po_id)
                  const vendorName = associatedPo?.vendors?.vendor_name || '-'

                  return (
                    <TableRow key={inv.id}>
                      <TableCell>{idx + 1}</TableCell>
                      <TableCell className="font-semibold">{inv.invoice_number || inv.inv_number || '-'}</TableCell>
                      <TableCell>{vendorName}</TableCell>
                      <TableCell>{inv.invoice_date || inv.date || '-'}</TableCell>
                      <TableCell><span className="text-xs font-medium px-2 py-1 bg-slate-100 rounded-md">{inv.status || '-'}</span></TableCell>
                      <TableCell className="text-right font-medium">Rp {Number(inv.amount || inv.total_amount || 0).toLocaleString('id-ID')}</TableCell>
                      <TableCell className="text-center">
                        <Link href={`/invoices/${inv.id}`}>
                          <Button variant="ghost" size="icon" title="Lihat Detail Invoice"><Eye className="w-4 h-4 text-amber-600"/></Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

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
                          <FileText className="w-3 h-3" /> Lihat Bukti Bayar
                        </button>
                        <button 
                          type="button"
                          onClick={() => handleDownloadDocument(pay.document_url, 'payment_documents')}
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
                </TableRow>
              ))}

              {payments.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-6 text-slate-400">
                    Belum ada riwayat pembayaran / cicilan untuk project ini.
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