'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ArrowLeft, Edit, Trash2, FileText } from 'lucide-react'
import Link from 'next/link'

export default function DetailPRPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const prId = resolvedParams.id
  const router = useRouter()
  const supabase = createClient()

  const [pr, setPr] = useState<any>(null)
  const [items, setItems] = useState<any[]>([])
  const [vendors, setVendors] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchDetail() {
      if (!prId) return
      setLoading(true)

      // Memaksa router membersihkan cache agar data terbaru dari database langsung ter-load
      router.refresh()

      // 1. Fetch Master Vendors untuk mapping nama vendor
      const { data: vendData } = await supabase.from('vendors').select('id, vendor_name')
      setVendors(vendData || [])

      // 2. Fetch Header PR beserta relasi Company & Project jika ada
      const { data: prData, error: prErr } = await supabase
        .from('purchase_requests')
        .select(`
          *,
          companies (company_name),
          projects (project_name)
        `)
        .eq('id', prId)
        .single()

      if (prErr || !prData) {
        alert('Data PR tidak ditemukan!')
        router.push('/pr')
        return
      }

      setPr(prData)

      // 3. Fetch Item Barang PR
      const { data: itemsData } = await supabase
        .from('purchase_request_items')
        .select('*')
        .eq('pr_id', prId)

      setItems(itemsData || [])
      setLoading(false)
    }

    fetchDetail()
  }, [prId, supabase, router])

  const handleDeletePR = async () => {
    if (!confirm('Apakah Anda yakin ingin menghapus Purchase Request ini secara permanen?')) return

    try {
      // Hapus item terkait terlebih dahulu
      await supabase.from('purchase_request_items').delete().eq('pr_id', prId)
      
      // Hapus header PR
      const { error } = await supabase.from('purchase_requests').delete().eq('id', prId)
      if (error) throw error

      alert('Purchase Request berhasil dihapus!')
      router.push('/pr')
    } catch (err: any) {
      alert('Gagal menghapus PR: ' + err.message)
    }
  }

  if (loading) return <div className="p-10 text-center text-slate-500">Memuat detail PR...</div>
  if (!pr) return null

  // Helper mencari nama vendor berdasarkan ID
  const getVendorName = (vendorId: string) => {
    const v = vendors.find(item => item.id === vendorId)
    return v ? v.vendor_name : '-'
  }

  const grandTotal = items.reduce((sum, item) => sum + (Number(item.subtotal) || 0), 0)

  return (
    <div className="p-6 max-w-[98%] mx-auto space-y-6 pb-24">
      {/* TOMBOL ATAS & AKSI */}
      <div className="flex justify-between items-center">
        <Link href="/pr">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" /> Kembali ke Daftar PR
          </Button>
        </Link>
        <div className="flex gap-2">
          <Link href={`/pr/${prId}/edit`}>
            <Button variant="outline" size="sm" className="bg-white text-blue-600 border-blue-200 hover:bg-blue-50">
              <Edit className="w-4 h-4 mr-2" /> Edit
            </Button>
          </Link>
          <Button variant="destructive" size="sm" onClick={handleDeletePR}>
            <Trash2 className="w-4 h-4 mr-2" /> Hapus
          </Button>
        </div>
      </div>

      {/* INFORMASI HEADER PR */}
      <Card>
        <CardHeader className="flex flex-row justify-between items-center pb-2">
          <CardTitle className="text-xl font-bold tracking-tight">
            Detail PR: {pr.pr_number}
          </CardTitle>
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200">
            {pr.status || 'Approved'}
          </span>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 text-sm">
            <div>
              <p className="text-slate-500 font-medium">Nomor PR</p>
              <p className="font-semibold text-slate-800 mt-0.5">{pr.pr_number || '-'}</p>
            </div>
            <div>
              <p className="text-slate-500 font-medium">Tanggal PR</p>
              <p className="font-semibold text-slate-800 mt-0.5">
                {pr.pr_date ? new Date(pr.pr_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}
              </p>
            </div>
            <div>
              <p className="text-slate-500 font-medium">Company</p>
              <p className="font-semibold text-slate-800 mt-0.5">{pr.companies?.company_name || '-'}</p>
            </div>
            <div>
              <p className="text-slate-500 font-medium">Project</p>
              <p className="font-semibold text-slate-800 mt-0.5">{pr.projects?.project_name || '-'}</p>
            </div>
            <div>
              <p className="text-slate-500 font-medium">PIC Internal</p>
              <p className="font-semibold text-slate-800 mt-0.5">{pr.pic_internal || '-'}</p>
            </div>
            <div>
              <p className="text-slate-500 font-medium">Catatan / Keterangan</p>
              <p className="font-semibold text-slate-800 mt-0.5">{pr.notes || '-'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* TABEL DAFTAR BARANG */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" /> Daftar Barang Pesanan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md bg-white overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="w-12 text-center">No</TableHead>
                  <TableHead className="min-w-[160px]">Nama Barang</TableHead>
                  <TableHead className="min-w-[140px]">Vendor</TableHead>
                  <TableHead className="min-w-[120px]">Brand</TableHead>
                  <TableHead className="min-w-[120px]">Model/Type</TableHead>
                  <TableHead className="min-w-[150px]">Spesifikasi</TableHead>
                  <TableHead className="w-20 text-center">Qty</TableHead>
                  <TableHead className="w-24">Satuan</TableHead>
                  <TableHead className="w-24 text-center">PPN</TableHead>
                  <TableHead className="min-w-[130px] text-right">Harga Satuan</TableHead>
                  <TableHead className="min-w-[130px] text-right">Total Harga</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-6 text-slate-400">
                      Tidak ada item barang dalam PR ini.
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((item, idx) => {
                    const qty = Number(item.quantity) || 0
                    const price = Number(item.unit_price) || 0
                    const subtotal = Number(item.subtotal) || 0
                    const hasPpn = subtotal > (qty * price)

                    return (
                      <TableRow key={item.id || idx}>
                        <TableCell className="text-center font-medium">{idx + 1}</TableCell>
                        <TableCell className="font-medium text-slate-800">{item.item_name}</TableCell>
                        <TableCell>{getVendorName(item.vendor_id)}</TableCell>
                        <TableCell>{item.brand || '-'}</TableCell>
                        <TableCell>{item.model_type || '-'}</TableCell>
                        <TableCell>{item.specification || '-'}</TableCell>
                        <TableCell className="text-center">{qty}</TableCell>
                        <TableCell>{item.unit || 'pcs'}</TableCell>
                        <TableCell className="text-center">
                          {hasPpn ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700">Ya</span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600">Tidak</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          Rp {price.toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          Rp {Math.round(subtotal).toLocaleString('id-ID')}
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}

                {/* GRAND TOTAL */}
                <TableRow className="bg-slate-50 font-bold">
                  <TableCell colSpan={10} className="text-right uppercase text-slate-800">TOTAL PR:</TableCell>
                  <TableCell className="text-right text-primary text-sm">
                    Rp {Math.round(grandTotal).toLocaleString('id-ID')}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}