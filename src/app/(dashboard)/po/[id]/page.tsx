'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ArrowLeft, Edit, Trash2, FileText, ExternalLink, Download, Package } from 'lucide-react'
import Link from 'next/link'

export default function DetailPOPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const poId = resolvedParams.id
  const router = useRouter()
  const supabase = createClient()

  const [poData, setPoData] = useState<any>(null)
  const [poItems, setPoItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchPODetail() {
      if (!poId) return
      setLoading(true)

      // 1. Ambil data utama PO
      const { data: po, error: poErr } = await supabase
        .from('purchase_orders')
        .select('*')
        .eq('id', poId)
        .single()

      if (poErr || !po) {
        console.error('DEBUG - Error PO:', poErr?.message)
        setLoading(false)
        return
      }

      // 2. Ambil data Vendor
      let vendorData = null
      const vendorKey = po.vendor_id || po.vendors_id
      if (vendorKey) {
        const { data: v } = await supabase.from('vendors').select('*').eq('id', vendorKey).single()
        vendorData = v
      }

      // 3. Ambil data Purchase Request (PR)
      const prKey = po.pr_id || po.purchase_request_id || po.purchase_requests_id || po.pr_uuid

      let prData = null
      let companyData = null
      let projectData = null

      if (prKey) {
        const { data: pr } = await supabase.from('purchase_requests').select('*').eq('id', prKey).single()
        prData = pr

        if (pr) {
          const compKey = pr.company_id || pr.company
          if (compKey) {
            const { data: comp } = await supabase.from('companies').select('*').eq('id', compKey).single()
            companyData = comp
          }

          const projKey = pr.project_id || pr.project
          if (projKey) {
            const { data: proj } = await supabase.from('projects').select('*').eq('id', projKey).single()
            projectData = proj
          }
        }
      }

      // 4. Ambil Item Barang PO
      const { data: items } = await supabase
        .from('purchase_order_items')
        .select('*')
        .eq('po_id', poId)

      setPoData({
        ...po,
        vendors: vendorData,
        purchase_requests: {
          ...(prData || {}),
          companies: companyData,
          projects: projectData
        }
      })
      setPoItems(items || [])
      setLoading(false)
    }

    fetchPODetail()
  }, [poId, supabase])

  const handleDelete = async () => {
    if (!confirm('Apakah Anda yakin ingin menghapus PO ini?')) return

    await supabase.from('purchase_order_items').delete().eq('po_id', poId)
    const { error } = await supabase.from('purchase_orders').delete().eq('id', poId)
    
    if (error) {
      alert('Gagal menghapus PO: ' + error.message)
    } else {
      router.push('/po')
    }
  }

  const handleOpenDocument = async (path: string) => {
    if (!path) return alert('Path dokumen tidak valid.')

    if (path.startsWith('http')) {
      window.open(path, '_blank')
      return
    }

    const { data } = supabase.storage.from('po_documents').getPublicUrl(path)
    
    if (data?.publicUrl) {
      window.open(data.publicUrl, '_blank')
    } else {
      alert('Gagal membuka dokumen.')
    }
  }

  const handleDownloadDocument = async (path: string) => {
    if (!path) return alert('Path dokumen tidak valid.')

    const cleanPath = path.replace(/^po_documents\//, '')
    const { data, error } = await supabase.storage.from('po_documents').download(cleanPath)
    
    if (error) {
      alert('Gagal mendownload: ' + error.message)
      return
    }

    const blob = new Blob([data])
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = cleanPath.split('/').pop() || 'po_document'
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
  }

  if (loading) return <div className="p-10 text-center text-slate-500">Memuat detail PO...</div>

  if (!poData) return <div className="p-10 text-center text-red-500">Data PO tidak ditemukan.</div>

  // Mapping data aman
  const pr = poData.purchase_requests || {}
  const companyName = pr.companies?.company_name || pr.companies?.name || '-'
  const prNumber = pr.pr_number || '-'
  
  const project = pr.projects || {}
  const projectName = project.project_name || project.name || '-'
  const customerName = project.customer || project.custmer || project.customer_name || '-'
  
  const vendor = poData.vendors || {}
  const vendorPIC = vendor.vendor_pic || vendor.pic || vendor.pic_name || vendor.contact_person || '-'

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <Link href="/po">
          <Button variant="outline" size="sm"><ArrowLeft className="w-4 h-4 mr-2" /> Kembali</Button>
        </Link>
        <div className="flex gap-2">
          <Link href={`/po/${poId}/edit`}>
            <Button variant="outline" size="sm" className="border-amber-500 text-amber-600"><Edit className="w-4 h-4 mr-2" /> Edit PO</Button>
          </Link>
          <Button variant="destructive" size="sm" onClick={handleDelete}><Trash2 className="w-4 h-4 mr-2" /> Hapus</Button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Package className="w-8 h-8 text-primary" />
        <h1 className="text-2xl font-bold">Detail PO: {poData.po_number}</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Informasi PO */}
        <Card>
          <CardHeader><CardTitle className="text-base">Informasi Purchase Order</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            {[
              { label: 'Company', value: companyName },
              { label: 'Nomor PO', value: poData.po_number },
              { label: 'Tanggal PO', value: poData.po_date || '-' },
              { label: 'Status', value: poData.status },
              { label: 'Referensi PR', value: prNumber },
              { label: 'Project', value: projectName },
              { label: 'Customer', value: customerName },
            ].map((item, i) => (
              <div key={i} className="flex justify-between border-b pb-2">
                <span className="text-slate-500">{item.label}</span>
                <span className="font-medium">{item.value}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Vendor & Dokumen */}
        <Card>
          <CardHeader><CardTitle className="text-base">Vendor & Dokumen</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between border-b pb-2">
              <span className="text-slate-500">Nama Vendor</span>
              <span className="font-semibold">{vendor.vendor_name || vendor.name || '-'}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-slate-500">PIC Vendor</span>
              <span className="font-medium">{vendorPIC}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-slate-500">Email Vendor</span>
              <span className="font-medium">{vendor.email || '-'}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-slate-500">Telepon Vendor</span>
              <span className="font-medium">{vendor.phone || '-'}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-slate-500">Alamat Vendor</span>
              <span className="font-medium">{vendor.address || '-'}</span>
            </div>
            <div className="flex justify-between items-center pt-2">
              <span className="text-slate-500">Lampiran Dokumen</span>
              {poData.document_url ? (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleOpenDocument(poData.document_url)}>
                    <FileText className="w-4 h-4 mr-1.5" /> Lihat <ExternalLink className="w-3 h-3 ml-1" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleDownloadDocument(poData.document_url)} className="text-green-600 border-green-200">
                    <Download className="w-4 h-4 mr-1.5" /> Download
                  </Button>
                </div>
              ) : <span className="text-xs text-slate-400">Tidak ada lampiran</span>}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabel Barang dengan Rincian PPN */}
      <Card>
        <CardHeader><CardTitle className="text-base">Daftar Barang Pesanan</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="w-12 text-center">No</TableHead>
                <TableHead>Nama Barang</TableHead>
                <TableHead>Brand</TableHead>
                <TableHead>Model/Type</TableHead>
                <TableHead className="text-center">Qty</TableHead>
                <TableHead className="text-right">Harga Satuan</TableHead>
                <TableHead className="text-right">Subtotal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {poItems.map((item, idx) => (
                <TableRow key={item.id || idx}>
                  <TableCell className="text-center font-medium">{idx + 1}</TableCell>
                  <TableCell className="font-semibold text-slate-800">{item.item_name}</TableCell>
                  <TableCell>{item.brand || '-'}</TableCell>
                  <TableCell>{item.model_type || '-'}</TableCell>
                  <TableCell className="text-center font-medium">{item.quantity}</TableCell>
                  <TableCell className="text-right">Rp {Number(item.unit_price || 0).toLocaleString('id-ID')}</TableCell>
                  <TableCell className="text-right font-semibold">Rp {Number(item.subtotal || 0).toLocaleString('id-ID')}</TableCell>
                </TableRow>
              ))}

              {poItems.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-6 text-slate-400">
                    Tidak ada item barang dalam PO ini.
                  </TableCell>
                </TableRow>
              )}

              {/* Kalkulasi Subtotal, PPN 11%, dan Total Amount */}
              {(() => {
                const totalAmount = Number(poData.total_amount || 0)
                const subtotalSebelumPPN = totalAmount / 1.11
                const ppn11 = totalAmount - subtotalSebelumPPN

                return (
                  <>
                    <TableRow className="bg-slate-50/50 border-t-2 border-slate-200">
                      <TableCell colSpan={5} />
                      <TableCell className="text-right font-medium text-xs text-slate-500 uppercase">
                        Subtotal (Sebelum PPN):
                      </TableCell>
                      <TableCell className="text-right font-medium text-slate-700">
                        Rp {Math.round(subtotalSebelumPPN).toLocaleString('id-ID')}
                      </TableCell>
                    </TableRow>

                    <TableRow className="bg-slate-50/50">
                      <TableCell colSpan={5} />
                      <TableCell className="text-right font-medium text-xs text-slate-500 uppercase">
                        PPN (11%):
                      </TableCell>
                      <TableCell className="text-right font-medium text-blue-600">
                        Rp {Math.round(ppn11).toLocaleString('id-ID')}
                      </TableCell>
                    </TableRow>

                    <TableRow className="bg-slate-100 font-bold">
                      <TableCell colSpan={5} />
                      <TableCell className="text-right uppercase text-slate-800">
                        TOTAL AMOUNT:
                      </TableCell>
                      <TableCell className="text-right text-primary text-base">
                        Rp {totalAmount.toLocaleString('id-ID')}
                      </TableCell>
                    </TableRow>
                  </>
                )
              })()}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}