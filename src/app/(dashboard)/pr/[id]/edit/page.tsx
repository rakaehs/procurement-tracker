'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Save, ArrowLeft, Plus, Trash2, FileText, Lock } from 'lucide-react'
import Link from 'next/link'

export default function EditPRPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const prId = resolvedParams.id
  const router = useRouter()
  const supabase = createClient()

  // Master Data State
  const [companies, setCompanies] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [vendors, setVendors] = useState<any[]>([])

  // Header PR State
  const [companyId, setCompanyId] = useState('')
  const [projectId, setProjectId] = useState('')
  const [prNumber, setPrNumber] = useState('')
  const [prDate, setPrDate] = useState('')
  const [picInternal, setPicInternal] = useState('')
  const [notes, setNotes] = useState('')

  // Item PR State
  const [items, setItems] = useState<any[]>([])
  const [deletedItemIds, setDeletedItemIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  // Helper format angka Indonesia: Ribuan titik, desimal koma
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

  // Helper parsing string ke float
  const parseNumberInput = (val: string) => {
    if (!val) return 0
    const clean = val.replace(/\./g, '').replace(',', '.')
    return parseFloat(clean) || 0
  }

  useEffect(() => {
    async function fetchData() {
      if (!prId) return
      setLoading(true)

      const { data: compData } = await supabase.from('companies').select('id, company_name')
      const { data: projData } = await supabase.from('projects').select('id, project_name')
      const { data: vendData } = await supabase.from('vendors').select('id, vendor_name')

      setCompanies(compData || [])
      setProjects(projData || [])
      setVendors(vendData || [])

      const { data: pr, error: prErr } = await supabase
        .from('purchase_requests')
        .select('*')
        .eq('id', prId)
        .single()

      if (prErr || !pr) {
        alert('Gagal mengambil data PR: ' + (prErr?.message || 'Data tidak ditemukan'))
        router.push('/pr')
        return
      }

      setCompanyId(pr.company_id || pr.company || '')
      setProjectId(pr.project_id || pr.project || '')
      setPrNumber(pr.pr_number || '')
      setPrDate(pr.pr_date || pr.created_at?.split('T')[0] || '')
      setPicInternal(pr.pic_internal || '')
      setNotes(pr.notes || pr.catatan || '')

      // Fetch Item Barang PR
      const { data: prItemsData } = await supabase
        .from('purchase_request_items')
        .select('*')
        .eq('pr_id', prId)

      // Cek apakah item sudah terbit PO
      let poItemIds = new Set()
      try {
        const itemIds = (prItemsData || []).map(i => i.id)
        if (itemIds.length > 0) {
          const { data: poData } = await supabase
            .from('purchase_order_items')
            .select('pr_item_id')
            .in('pr_item_id', itemIds)
          
          if (poData) {
            poData.forEach(p => {
              if (p.pr_item_id) poItemIds.add(p.pr_item_id)
            })
          }
        }
      } catch (err) {
        console.warn('Pemeriksaan PO dilewati')
      }

      const formattedItems = (prItemsData || []).map(item => {
        const qty = Number(item.quantity) || 1
        const price = Number(item.unit_price) || 0
        const subtotal = Number(item.subtotal) || qty * price
        const base = qty * price
        const hasPpn = subtotal > base
        const priceStr = String(price).replace('.', ',')

        return {
          id: item.id,
          item_name: item.item_name || '',
          vendor_id: item.vendor_id || '',
          brand: item.brand || '',
          model_type: item.model_type || '',
          specification: item.specification || '',
          quantity: qty,
          unit: item.unit || 'pcs',
          is_ppn: hasPpn,
          unit_price: price,
          unit_price_formatted: formatNumberInput(priceStr),
          subtotal: subtotal,
          has_po: poItemIds.has(item.id)
        }
      })

      setItems(formattedItems.length > 0 ? formattedItems : [{
        id: null,
        item_name: '', vendor_id: '', brand: '', model_type: '', specification: '', quantity: 1, unit: 'pcs', is_ppn: false, unit_price: 0, unit_price_formatted: '', subtotal: 0, has_po: false
      }])
      setLoading(false)
    }

    fetchData()
  }, [prId, supabase, router])

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        id: null,
        item_name: '',
        vendor_id: '',
        brand: '',
        model_type: '',
        specification: '',
        quantity: 1,
        unit: 'pcs',
        is_ppn: false,
        unit_price: 0,
        unit_price_formatted: '',
        subtotal: 0,
        has_po: false
      }
    ])
  }

  const handleRemoveItem = (index: number) => {
    const targetItem = items[index]

    if (targetItem.has_po) {
      alert('Peringatan: Barang ini tidak dapat dihapus karena Purchase Order (PO) untuk barang / PR tersebut telah terbit!')
      return
    }

    if (items.length === 1) {
      return alert('Minimal harus ada 1 item barang!')
    }

    if (targetItem.id) {
      setDeletedItemIds(prev => [...prev, targetItem.id])
    }

    setItems(items.filter((_, idx) => idx !== index))
  }

  const handleItemChange = (index: number, field: string, value: any) => {
    const updatedItems = [...items]
    const item = { ...updatedItems[index] }

    if (field === 'unit_price_formatted') {
      const sanitized = value.replace(/[^0-9,]/g, '')
      item.unit_price_formatted = formatNumberInput(sanitized)
      item.unit_price = parseNumberInput(sanitized)
    } else {
      item[field] = value
    }

    const qty = Number(item.quantity) || 0
    const price = Number(item.unit_price) || 0
    const usePpn = String(item.is_ppn) === 'true'

    const baseTotal = qty * price
    item.subtotal = usePpn ? baseTotal + (baseTotal * 0.11) : baseTotal

    updatedItems[index] = item
    setItems(updatedItems)
  }

  const grandTotal = items.reduce((sum, item) => sum + (Number(item.subtotal) || 0), 0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return

    if (!prNumber.trim()) return alert('Nomor PR wajib diisi!')
    if (items.length === 0) return alert('Minimal harus ada 1 item barang!')

    setLoading(true)

    try {
      // 1. Update Header
      const { error: prUpdateErr } = await supabase
        .from('purchase_requests')
        .update({
          company_id: companyId || null,
          project_id: projectId || null,
          pr_number: prNumber,
          pr_date: prDate || null,
          pic_internal: picInternal,
          notes: notes
        })
        .eq('id', prId)

      if (prUpdateErr) throw prUpdateErr

      // 2. Hapus yang antre
      if (deletedItemIds.length > 0) {
        await supabase.from('purchase_request_items').delete().in('id', deletedItemIds)
      }

      // 3. Upsert
      for (const item of items) {
        const qty = Number(item.quantity) || 0
        const price = Number(item.unit_price) || 0
        const baseTotal = qty * price
        const usePpn = String(item.is_ppn) === 'true'
        const finalSubtotal = usePpn ? baseTotal + (baseTotal * 0.11) : baseTotal

        const payload = {
          pr_id: prId,
          item_name: item.item_name,
          vendor_id: item.vendor_id || null,
          brand: item.brand,
          model_type: item.model_type,
          specification: item.specification,
          quantity: qty,
          unit: item.unit || 'pcs',
          unit_price: price,
          subtotal: finalSubtotal
        }

        if (item.id) {
          await supabase.from('purchase_request_items').update(payload).eq('id', item.id)
        } else {
          await supabase.from('purchase_request_items').insert(payload)
        }
      }

      alert('Purchase Request berhasil diperbarui!')
      // Memaksa browser muat ulang halaman detail agar cache hilang
      window.location.href = `/pr/${prId}`
    } catch (err: any) {
      alert('Gagal: ' + err.message)
      setLoading(false)
    }
  }

  if (loading) return <div className="p-10 text-center text-slate-500">Memuat data PR...</div>

  return (
    <div className="p-6 max-w-[98%] mx-auto space-y-6 pb-24">
      <div className="flex justify-between items-center">
        <Link href={`/pr/${prId}`}>
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" /> Kembali ke Detail PR
          </Button>
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Edit Purchase Request (PR)</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" /> Informasi Header
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Company</Label>
                <select className="w-full border rounded-md px-3 py-2 text-sm bg-white" value={companyId} onChange={(e) => setCompanyId(e.target.value)}>
                  <option value="">-- Pilih Company --</option>
                  {companies.map((c) => <option key={c.id} value={c.id}>{c.company_name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Project</Label>
                <select className="w-full border rounded-md px-3 py-2 text-sm bg-white" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                  <option value="">-- Pilih Project --</option>
                  {projects.map((p) => <option key={p.id} value={p.id}>{p.project_name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Nomor PR *</Label>
                <Input value={prNumber} onChange={(e) => setPrNumber(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Tanggal PR</Label>
                <Input type="date" value={prDate} onChange={(e) => setPrDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>PIC Internal</Label>
                <Input value={picInternal} onChange={(e) => setPicInternal(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Catatan / Keterangan</Label>
                <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row justify-between items-center">
            <CardTitle className="text-base">Daftar Barang Pesanan</CardTitle>
            <Button type="button" onClick={handleAddItem} size="sm"><Plus className="w-4 h-4 mr-2" /> Tambah Barang</Button>
          </CardHeader>
          <CardContent>
            <div className="border rounded-md bg-white overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="w-12 text-center">No</TableHead>
                    <TableHead className="min-w-[160px]">Nama Barang *</TableHead>
                    <TableHead className="min-w-[150px]">Vendor</TableHead>
                    <TableHead>Brand</TableHead>
                    <TableHead>Model/Type</TableHead>
                    <TableHead>Spesifikasi</TableHead>
                    <TableHead className="w-20 text-center">Qty *</TableHead>
                    <TableHead>Satuan</TableHead>
                    <TableHead>PPN</TableHead>
                    <TableHead>Harga Satuan</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead className="text-center">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, idx) => (
                    <TableRow key={idx} className={item.has_po ? 'bg-amber-50/40' : ''}>
                      <TableCell className="text-center">{idx + 1}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Input value={item.item_name} onChange={(e) => handleItemChange(idx, 'item_name', e.target.value)} className="h-8 text-xs" required />
                          {item.has_po && <Lock className="w-4 h-4 text-amber-600" />}
                        </div>
                      </TableCell>
                      <TableCell>
                        <select className="w-full h-8 border rounded text-xs" value={item.vendor_id} onChange={(e) => handleItemChange(idx, 'vendor_id', e.target.value)}>
                            <option value="">Vendor</option>
                            {vendors.map(v => <option key={v.id} value={v.id}>{v.vendor_name}</option>)}
                        </select>
                      </TableCell>
                      <TableCell><Input className="h-8 text-xs" value={item.brand} onChange={(e) => handleItemChange(idx, 'brand', e.target.value)}/></TableCell>
                      <TableCell><Input className="h-8 text-xs" value={item.model_type} onChange={(e) => handleItemChange(idx, 'model_type', e.target.value)}/></TableCell>
                      <TableCell><Input className="h-8 text-xs" value={item.specification} onChange={(e) => handleItemChange(idx, 'specification', e.target.value)}/></TableCell>
                      <TableCell><Input type="number" className="h-8 text-xs text-center" value={item.quantity} onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}/></TableCell>
                      <TableCell><Input className="h-8 text-xs" value={item.unit} onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}/></TableCell>
                      <TableCell>
                        <select className="h-8 border rounded text-xs" value={item.is_ppn ? 'true' : 'false'} onChange={(e) => handleItemChange(idx, 'is_ppn', e.target.value)}>
                          <option value="false">Tidak</option><option value="true">Ya</option>
                        </select>
                      </TableCell>
                      <TableCell><Input className="h-8 text-xs text-right" value={item.unit_price_formatted} onChange={(e) => handleItemChange(idx, 'unit_price_formatted', e.target.value)}/></TableCell>
                      <TableCell className="text-right text-xs">Rp {Math.round(item.subtotal).toLocaleString('id-ID')}</TableCell>
                      <TableCell className="text-center">
                        <Button type="button" variant={item.has_po ? "outline" : "destructive"} className="h-7 w-7 p-0" onClick={() => handleRemoveItem(idx)} disabled={item.has_po}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
        <div className="flex justify-center pt-4">
          <Button type="submit" size="lg" disabled={loading}>Simpan Perubahan</Button>
        </div>
      </form>
    </div>
  )
}