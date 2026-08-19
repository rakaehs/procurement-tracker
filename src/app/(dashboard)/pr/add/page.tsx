'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import Link from 'next/link'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'

// Helper untuk format angka
function formatNumberInput(value: string | number): string {
  if (value === '' || value === undefined || value === null) return ''
  const stringVal = String(value).replace(/\./g, '').replace(',', '.')
  const parts = stringVal.split('.')
  const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  if (parts.length > 1) {
    return `${integerPart},${parts[1]}`
  }
  return integerPart
}

function parseNumberInput(value: string): number {
  if (!value) return 0
  const normalized = value.replace(/\./g, '').replace(',', '.')
  const num = parseFloat(normalized)
  return isNaN(num) ? 0 : num
}

export default function AddPRPage() {
  const router = useRouter()
  const supabase = createClient()

  const [companies, setCompanies] = useState<any[]>([])
  const [customers, setCustomers] = useState<any[]>([])
  const [vendors, setVendors] = useState<any[]>([])
  const [allProjects, setAllProjects] = useState<any[]>([])
  const [filteredProjects, setFilteredProjects] = useState<any[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [loading, setLoading] = useState(false)

  const [formData, setFormData] = useState({
    company_id: '',
    customer_id: '',
    project_name: '',
    pic_internal: '',
    pr_number: '',
    request_date: '',
    status: 'Submitted',
    notes: ''
  })

  const createEmptyRow = () => ({
    id: Math.random().toString(36).substring(2, 9),
    item_name: '',
    vendor_id: '',
    brand: '',
    model_type: '',
    specification: '',
    quantity: '',
    unit: 'pcs',
    unit_price: '',
    ppn: 'Tidak'
  })

  const [items, setItems] = useState<any[]>(Array(5).fill(null).map(() => createEmptyRow()))

  useEffect(() => {
    async function fetchMaster() {
      const { data: comp } = await supabase.from('companies').select('*')
      if (comp) setCompanies(comp)
      
      const { data: cust } = await supabase.from('customers').select('*')
      if (cust) setCustomers(cust)
      
      const { data: vend } = await supabase.from('vendors').select('*')
      if (vend) setVendors(vend)
      
      const { data: proj } = await supabase.from('projects').select('*')
      if (proj) setAllProjects(proj)
    }
    fetchMaster()
  }, [supabase])

  // Logic saat mengetik nama project untuk memunculkan floating dropdown & auto-fill
  const handleProjectNameChange = (val: string) => {
    setFormData(prev => ({ ...prev, project_name: val }))

    if (val.trim() === '') {
      setFilteredProjects([])
      setShowSuggestions(false)
      return
    }

    const matches = allProjects.filter(p => 
      p.project_name.toLowerCase().includes(val.toLowerCase())
    )
    setFilteredProjects(matches)
    setShowSuggestions(matches.length > 0)

    const exactMatch = allProjects.find(p => p.project_name.toLowerCase() === val.toLowerCase())
    if (exactMatch) {
      setFormData(prev => ({
        ...prev,
        company_id: exactMatch.company_id || '',
        customer_id: exactMatch.customer_id || '',
        pic_internal: exactMatch.internal_pic || '' // Mengambil dari internal_pic database
      }))
    }
  }

  const handleSelectSuggestion = (proj: any) => {
    setFormData(prev => ({
      ...prev,
      project_name: proj.project_name,
      company_id: proj.company_id || '',
      customer_id: proj.customer_id || '',
      pic_internal: proj.internal_pic || '' // Mengambil dari internal_pic database
    }))
    setShowSuggestions(false)
  }

  const handleItemChange = (index: number, field: string, value: any) => {
    const updatedItems = [...items]
    updatedItems[index][field] = value
    setItems(updatedItems)
  }

  const handleAddRow = () => setItems([...items, createEmptyRow()])
  
  const handleRemoveRow = (index: number) => {
    if (items.length === 1) return alert('Minimal 1 baris')
    setItems(items.filter((_, i) => i !== index))
  }

  const calculateRowTotal = (item: any) => {
    const qty = parseNumberInput(item.quantity)
    const price = parseNumberInput(item.unit_price)
    const baseSubtotal = qty * price
    return item.ppn === 'Ya' ? baseSubtotal + (baseSubtotal * 0.11) : baseSubtotal
  }

  const calculateRowPpnAmount = (item: any) => {
    const qty = parseNumberInput(item.quantity)
    const price = parseNumberInput(item.unit_price)
    return item.ppn === 'Ya' ? (qty * price) * 0.11 : 0
  }

  const totalPR = items.reduce((sum, item) => sum + calculateRowTotal(item), 0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      let projectId = null
      
      const existingProject = allProjects.find(p => 
        p.project_name.toLowerCase() === formData.project_name.trim().toLowerCase() &&
        String(p.company_id || '') === String(formData.company_id || '') &&
        String(p.customer_id || '') === String(formData.customer_id || '')
      )

      if (existingProject) {
        const confirmUpdate = window.confirm(
          `Project "${formData.project_name}" dengan Company dan Customer yang sama sudah terdaftar. Apakah Anda ingin mengupdate internal PIC project ini?`
        )
        if (!confirmUpdate) {
            setLoading(false)
            return
        }

        // Update internal_pic pada project yang sudah ada
        await supabase.from('projects').update({
          internal_pic: formData.pic_internal || null
        }).eq('id', existingProject.id)

        projectId = existingProject.id
      } else {
        // Insert project baru dengan kolom internal_pic yang sesuai
        const { data: newProj, error: projErr } = await supabase.from('projects').insert({
          project_name: formData.project_name.trim(),
          customer_id: formData.customer_id || null,
          company_id: formData.company_id || null,
          internal_pic: formData.pic_internal || null // Disimpan ke internal_pic
        }).select().single()
        
        if (projErr) throw projErr
        projectId = newProj.id
      }

      const { data: prData, error: prError } = await supabase
        .from('purchase_requests')
        .insert({
          company_id: formData.company_id || null,
          project_id: projectId,
          pr_number: formData.pr_number,
          pic_internal: formData.pic_internal,
          request_date: formData.request_date || null,
          status: formData.status,
          notes: formData.notes
        })
        .select().single()

      if (prError) throw prError

      const validItems = items.filter(item => item.item_name.trim() !== '' && parseNumberInput(item.quantity) > 0)
      const itemsToInsert = validItems.map(item => ({
        pr_id: prData.id,
        item_name: item.item_name,
        vendor_id: item.vendor_id || null,
        brand: item.brand,
        model_type: item.model_type,
        specification: item.specification,
        quantity: parseNumberInput(item.quantity),
        unit: item.unit,
        unit_price: parseNumberInput(item.unit_price),
        ppn: calculateRowPpnAmount(item),
        subtotal: calculateRowTotal(item)
      }))

      await supabase.from('purchase_request_items').insert(itemsToInsert)

      alert('PR & Project berhasil disimpan!')
      router.push('/pr')
    } catch (error: any) {
      alert(`Gagal: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-[95%] mx-auto space-y-6">
      <Link href="/pr"><Button variant="outline" size="sm"><ArrowLeft className="w-4 h-4 mr-2" /> Kembali</Button></Link>
      <Card>
        <CardHeader><CardTitle>Tambah Purchase Request (PR)</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* INPUT PROJECT DENGAN FLOATING DROPDOWN */}
              <div className="space-y-2 relative">
                <Label>Nama Project</Label>
                <Input 
                  required 
                  placeholder="Ketik nama project..." 
                  value={formData.project_name} 
                  onChange={e => handleProjectNameChange(e.target.value)}
                  onFocus={() => {
                    if (formData.project_name.trim() && filteredProjects.length > 0) {
                      setShowSuggestions(true)
                    }
                  }}
                  onBlur={() => {
                    setTimeout(() => setShowSuggestions(false), 200)
                  }}
                />
                
                {showSuggestions && filteredProjects.length > 0 && (
                  <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {filteredProjects.map((p) => (
                      <div
                        key={p.id}
                        onMouseDown={() => handleSelectSuggestion(p)}
                        className="px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 cursor-pointer border-b border-slate-50 last:border-b-0"
                      >
                        <div className="font-medium">{p.project_name}</div>
                      </div>
                    ))}
                  </div>
                )}
                
                <p className="text-xs text-slate-400 italic">Ketik untuk mencari saran atau buat baru.</p>
              </div>

              <div className="space-y-2">
                <Label>Customer</Label>
                <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm" value={formData.customer_id} onChange={e => setFormData({...formData, customer_id: e.target.value})}>
                  <option value="">Pilih Customer</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.instansi_name || c.customer_name || c.name || 'Customer Tanpa Nama'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label>Company</Label>
                <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm" value={formData.company_id} onChange={e => setFormData({...formData, company_id: e.target.value})}>
                  <option value="">Pilih Company</option>
                  {companies.map(c => <option key={c.id} value={c.id}>{c.name || c.company_name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label>PIC Internal</Label>
                <Input placeholder="Nama PIC" value={formData.pic_internal} onChange={e => setFormData({...formData, pic_internal: e.target.value})} />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Nomor PR</Label>
                <Input required placeholder="PR/2026/001" value={formData.pr_number} onChange={e => setFormData({...formData, pr_number: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Tanggal PR</Label>
                <Input type="date" required value={formData.request_date} onChange={e => setFormData({...formData, request_date: e.target.value})} />
              </div>
            </div>

            <div className="border-t pt-4 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-base">Daftar Barang PR</h3>
                <Button type="button" size="sm" onClick={handleAddRow} variant="outline"><Plus className="w-4 h-4 mr-1" /> Tambah Baris</Button>
              </div>
              <div className="border rounded-md bg-white overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>No</TableHead>
                      <TableHead>Nama Barang</TableHead>
                      <TableHead>Vendor</TableHead>
                      <TableHead>Brand</TableHead>
                      <TableHead>Model/Type</TableHead>
                      <TableHead>Spesifikasi</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Satuan</TableHead>
                      <TableHead>PPN (11%)</TableHead>
                      <TableHead>Harga Satuan</TableHead>
                      <TableHead>Total Harga</TableHead>
                      <TableHead>Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item, index) => (
                      <TableRow key={item.id}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell><Input className="h-8 text-xs" value={item.item_name} onChange={e => handleItemChange(index, 'item_name', e.target.value)} /></TableCell>
                        <TableCell>
                          <select className="h-8 text-xs border rounded w-full" value={item.vendor_id} onChange={e => handleItemChange(index, 'vendor_id', e.target.value)}>
                            <option value="">Vendor</option>
                            {vendors.map(v => <option key={v.id} value={v.id}>{v.vendor_name}</option>)}
                          </select>
                        </TableCell>
                        <TableCell><Input className="h-8 text-xs" value={item.brand} onChange={e => handleItemChange(index, 'brand', e.target.value)} /></TableCell>
                        <TableCell><Input className="h-8 text-xs" value={item.model_type} onChange={e => handleItemChange(index, 'model_type', e.target.value)} /></TableCell>
                        <TableCell><Input className="h-8 text-xs" value={item.specification} onChange={e => handleItemChange(index, 'specification', e.target.value)} /></TableCell>
                        <TableCell><Input className="h-8 text-xs text-center" value={formatNumberInput(item.quantity)} onChange={e => handleItemChange(index, 'quantity', e.target.value)} /></TableCell>
                        <TableCell><Input className="h-8 text-xs" value={item.unit} onChange={e => handleItemChange(index, 'unit', e.target.value)} /></TableCell>
                        <TableCell>
                          <select className="h-8 text-xs border rounded w-full" value={item.ppn} onChange={e => handleItemChange(index, 'ppn', e.target.value)}>
                            <option value="Tidak">Tidak</option>
                            <option value="Ya">Ya</option>
                          </select>
                        </TableCell>
                        <TableCell><Input className="h-8 text-xs text-right" value={formatNumberInput(item.unit_price)} onChange={e => handleItemChange(index, 'unit_price', e.target.value)} /></TableCell>
                        <TableCell className="text-right font-medium text-xs">Rp {calculateRowTotal(item).toLocaleString('id-ID')}</TableCell>
                        <TableCell><Button type="button" variant="ghost" size="sm" onClick={() => handleRemoveRow(index)} className="h-8 text-red-500"><Trash2 className="w-4 h-4" /></Button></TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-slate-50 font-bold">
                      <TableCell colSpan={10} className="text-right uppercase">TOTAL PR:</TableCell>
                      <TableCell className="text-right text-primary">Rp {totalPR.toLocaleString('id-ID')}</TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>{loading ? 'Menyimpan...' : 'Simpan PR'}</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}