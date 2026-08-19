'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Save, ArrowLeft, FileText, Trash2, Plus, Upload, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'

export default function EditPOPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const poId = resolvedParams.id
  const router = useRouter()
  const supabase = createClient()

  // State Header PO
  const [poNumber, setPoNumber] = useState('')
  const [poDate, setPoDate] = useState('')
  const [status, setStatus] = useState('Released')
  const [vendorId, setVendorId] = useState('')
  const [projectId, setProjectId] = useState('')
  const [prId, setPrId] = useState('')
  const [existingDocUrl, setexistingDocUrl] = useState<string | null>(null)
  const [newFile, setNewFile] = useState<File | null>(null)

  // Master Data & Items State
  const [vendors, setVendors] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [items, setItems] = useState<any[]>([])
  const [deletedItemIds, setDeletedItemIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  // Helper format angka Indonesia
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

  // Fetch Data PO dan Master Data
  useEffect(() => {
    async function fetchPoData() {
      if (!poId) return
      setLoading(true)

      // 1. Fetch Vendors & Projects untuk dropdown
      const { data: vendData } = await supabase.from('vendors').select('id, vendor_name')
      const { data: projData } = await supabase.from('projects').select('id, project_name')
      setVendors(vendData || [])
      setProjects(projData || [])

      // 2. Fetch Data PO utama
      const { data: poData, error: poErr } = await supabase
        .from('purchase_orders')
        .select('*')
        .eq('id', poId)
        .single()

      if (poErr || !poData) {
        alert('Gagal memuat data PO: ' + (poErr?.message || 'Data tidak ditemukan'))
        router.push('/po')
        return
      }

      setPoNumber(poData.po_number || '')
      setPoDate(poData.po_date || '')
      setStatus(poData.status || 'Released')
      setVendorId(poData.vendor_id || '')
      setProjectId(poData.project_id || '')
      setPrId(poData.pr_id || '')
      setexistingDocUrl(poData.document_url || null)

      // 3. Fetch Item PO
      const { data: itemsData, error: itemsErr } = await supabase
        .from('purchase_order_items')
        .select('*')
        .eq('po_id', poId)

      if (itemsErr) {
        console.error('Gagal memuat item PO:', itemsErr.message)
      }

      const formattedItems = (itemsData || []).map((item: any) => {
        const qty = Number(item.quantity) || 1
        const price = Number(item.unit_price) || 0
        const subtotal = Number(item.subtotal) || qty * price
        const priceStr = String(price).replace('.', ',')

        return {
          id: item.id,
          pr_item_id: item.pr_item_id || null,
          item_name: item.item_name || '',
          brand: item.brand || '',
          model_type: item.model_type || '',
          specification: item.specification || '',
          quantity: qty,
          unit: item.unit || 'pcs',
          unit_price: price,
          unit_price_formatted: formatNumberInput(priceStr),
          subtotal: subtotal
        }
      })

      setItems(formattedItems)
      setLoading(false)
    }

    fetchPoData()
  }, [poId, supabase, router])

  const handleItemChange = (index: number, field: string, value: any) => {
    const updated = [...items]
    const item = { ...updated[index] }

    if (field === 'unit_price_formatted') {
      const sanitized = value.replace(/[^0-9,]/g, '')
      item.unit_price_formatted = formatNumberInput(sanitized)
      item.unit_price = parseNumberInput(sanitized)
    } else {
      item[field] = value
    }

    const qty = Number(item.quantity) || 0
    const price = Number(item.unit_price) || 0
    item.subtotal = qty * price

    updated[index] = item
    setItems(updated)
  }

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        id: null,
        pr_item_id: null,
        item_name: '',
        brand: '',
        model_type: '',
        specification: '',
        quantity: 1,
        unit: 'pcs',
        unit_price: 0,
        unit_price_formatted: '',
        subtotal: 0
      }
    ])
  }

  const handleRemoveItem = (index: number) => {
    const target = items[index]
    if (items.length === 1) {
      return alert('Minimal harus ada 1 item barang dalam PO!')
    }
    if (target.id) {
      setDeletedItemIds(prev => [...prev, target.id])
    }
    setItems(items.filter((_, idx) => idx !== index))
  }

  const grandTotal = items.reduce((sum, item) => sum + (Number(item.subtotal) || 0), 0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return

    if (!poNumber.trim()) return alert('Nomor PO wajib diisi!')
    if (items.length === 0) return alert('Minimal harus ada 1 item barang!')

    setLoading(true)

    try {
      let fileUrl = existingDocUrl

      // Upload file baru jika ada
      if (newFile) {
        const fileExt = newFile.name.split('.').pop()
        const fileName = `po_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`
        
        const { data: uploadData, error: uploadErr } = await supabase.storage
          .from('po_documents')
          .upload(fileName, newFile)

        if (uploadErr) throw uploadErr
        fileUrl = uploadData.path
      }

      // 1. Update Header PO
      const { error: poUpdateErr } = await supabase
        .from('purchase_orders')
        .update({
          po_number: poNumber,
          po_date: poDate || null,
          status: status,
          vendor_id: vendorId || null,
          project_id: projectId || null,
          total_amount: grandTotal,
          document_url: fileUrl
        })
        .eq('id', poId)

      if (poUpdateErr) throw poUpdateErr

      // 2. Hapus item yang masuk antrean hapus
      if (deletedItemIds.length > 0) {
        await supabase.from('purchase_order_items').delete().in('id', deletedItemIds)
      }

      // 3. Upsert item PO (Update yang punya ID, Insert yang baru)
      for (const item of items) {
        const qty = Number(item.quantity) || 0
        const price = Number(item.unit_price) || 0
        const subtotal = qty * price

        const payload = {
          po_id: poId,
          pr_item_id: item.pr_item_id || null,
          item_name: item.item_name,
          brand: item.brand,
          model_type: item.model_type,
          specification: item.specification,
          quantity: qty,
          unit: item.unit || 'pcs',
          unit_price: price,
          subtotal: subtotal
        }

        if (item.id) {
          await supabase.from('purchase_order_items').update(payload).eq('id', item.id)
        } else {
          await supabase.from('purchase_order_items').insert(payload)
        }
      }

      alert('Purchase Order berhasil diperbarui!')
      window.location.href = `/po/${poId}` // Memaksa refresh total membuang cache router
    } catch (err: any) {
      alert('Gagal memperbarui PO: ' + err.message)
      setLoading(false)
    }
  }

  if (loading) return <div className="p-10 text-center text-slate-500">Memuat data PO...</div>

  return (
    <div className="p-6 max-w-[98%] mx-auto space-y-6 pb-24">
      <div className="flex justify-between items-center">
        <Link href={`/po/${poId}`}>
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" /> Kembali ke Detail PO
          </Button>
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Edit Purchase Order (PO)</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* HEADER PO CARD */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" /> Informasi Header PO
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Nomor PO *</Label>
                <Input value={poNumber} onChange={(e) => setPoNumber(e.target.value)} required />
              </div>

              <div className="space-y-2">
                <Label>Tanggal PO</Label>
                <Input type="date" value={poDate} onChange={(e) => setPoDate(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label>Status PO</Label>
                <select 
                  className="w-full border rounded-md px-3 py-2 text-sm bg-white h-10" 
                  value={status} 
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="Released">Released</option>
                  <option value="Pending">Pending</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label>Vendor</Label>
                <select 
                  className="w-full border rounded-md px-3 py-2 text-sm bg-white h-10" 
                  value={vendorId} 
                  onChange={(e) => setVendorId(e.target.value)}
                >
                  <option value="">-- Pilih Vendor --</option>
                  {vendors.map(v => <option key={v.id} value={v.id}>{v.vendor_name}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <Label>Project</Label>
                <select 
                  className="w-full border rounded-md px-3 py-2 text-sm bg-white h-10" 
                  value={projectId} 
                  onChange={(e) => setProjectId(e.target.value)}
                >
                  <option value="">-- Pilih Project --</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.project_name}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <Label>Unggah / Ganti Dokumen PO (PDF/Img)</Label>
                <div className="flex items-center gap-2">
                  <Input 
                    type="file" 
                    onChange={(e) => setNewFile(e.target.files?.[0] || null)} 
                    className="cursor-pointer text-xs" 
                  />
                </div>
                {existingDocUrl && !newFile && (
                  <p className="text-[11px] text-emerald-600 flex items-center gap-1 mt-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Dokumen lama tersimpan
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ITEMS PO CARD */}
        <Card>
          <CardHeader className="flex flex-row justify-between items-center">
            <CardTitle className="text-base">Daftar Barang PO</CardTitle>
            <Button type="button" onClick={handleAddItem} size="sm">
              <Plus className="w-4 h-4 mr-2" /> Tambah Barang
            </Button>
          </CardHeader>
          <CardContent>
            <div className="border rounded-md bg-white overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="w-12 text-center">No</TableHead>
                    <TableHead className="min-w-[160px]">Nama Barang *</TableHead>
                    <TableHead>Brand</TableHead>
                    <TableHead>Model/Type</TableHead>
                    <TableHead>Spesifikasi</TableHead>
                    <TableHead className="w-20 text-center">Qty *</TableHead>
                    <TableHead>Satuan</TableHead>
                    <TableHead>Harga Satuan</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                    <TableHead className="text-center">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="text-center">{idx + 1}</TableCell>
                      <TableCell>
                        <Input 
                          value={item.item_name} 
                          onChange={(e) => handleItemChange(idx, 'item_name', e.target.value)} 
                          className="h-8 text-xs" 
                          required 
                        />
                      </TableCell>
                      <TableCell>
                        <Input className="h-8 text-xs" value={item.brand} onChange={(e) => handleItemChange(idx, 'brand', e.target.value)} />
                      </TableCell>
                      <TableCell>
                        <Input className="h-8 text-xs" value={item.model_type} onChange={(e) => handleItemChange(idx, 'model_type', e.target.value)} />
                      </TableCell>
                      <TableCell>
                        <Input className="h-8 text-xs" value={item.specification} onChange={(e) => handleItemChange(idx, 'specification', e.target.value)} />
                      </TableCell>
                      <TableCell>
                        <Input 
                          type="number" 
                          className="h-8 text-xs text-center" 
                          value={item.quantity} 
                          onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)} 
                        />
                      </TableCell>
                      <TableCell>
                        <Input className="h-8 text-xs" value={item.unit} onChange={(e) => handleItemChange(idx, 'unit', e.target.value)} />
                      </TableCell>
                      <TableCell>
                        <Input 
                          className="h-8 text-xs text-right" 
                          value={item.unit_price_formatted} 
                          onChange={(e) => handleItemChange(idx, 'unit_price_formatted', e.target.value)} 
                        />
                      </TableCell>
                      <TableCell className="text-right text-xs font-medium">
                        Rp {Math.round(item.subtotal).toLocaleString('id-ID')}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button 
                          type="button" 
                          variant="destructive" 
                          className="h-7 w-7 p-0" 
                          onClick={() => handleRemoveItem(idx)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex justify-end pt-4 font-bold text-sm">
              <span>GRAND TOTAL PO: Rp {Math.round(grandTotal).toLocaleString('id-ID')}</span>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-center pt-4">
          <Button type="submit" size="lg" disabled={loading}>
            <Save className="w-4 h-4 mr-2" /> Simpan Perubahan PO
          </Button>
        </div>
      </form>
    </div>
  )
}