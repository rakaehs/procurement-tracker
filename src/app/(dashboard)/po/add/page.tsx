'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { 
  Save, ArrowLeft, Plus, Trash2, FileText, CheckCircle2, AlertTriangle, X, 
  ChevronDown, Info, Search 
} from 'lucide-react'
import Link from 'next/link'

export default function AddPOPage() {
  const router = useRouter()
  const supabase = createClient()

  const [prs, setPrs] = useState<any[]>([])
  const [selectedPrId, setSelectedPrId] = useState('')
  
  const [prItems, setPrItems] = useState<any[]>([])
  const [allVendors, setAllVendors] = useState<any[]>([])
  const [filteredVendors, setFilteredVendors] = useState<any[]>([])
  const [existingPoVendorIds, setExistingPoVendorIds] = useState<string[]>([])
  
  const [selectedVendorToAdd, setSelectedVendorToAdd] = useState('')
  const [activeVendorIds, setActiveVendorIds] = useState<string[]>([])
  const [poInputs, setPoInputs] = useState<any>({})
  const [loading, setLoading] = useState(false)
  const [isDataFetching, setIsDataFetching] = useState(true)

  // STATE CUSTOM DROPDOWN PR, SEARCH & HOVER PREVIEW
  const [isPrDropdownOpen, setIsPrDropdownOpen] = useState(false)
  const [prSearchTerm, setPrSearchTerm] = useState('')
  const [hoveredPr, setHoveredPr] = useState<any | null>(null)
  
  const dropdownRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // STATE POP-UP MODAL "PO SUDAH TERBIT"
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false)
  const [duplicateVendorName, setDuplicateVendorName] = useState('')

  // Helper untuk format tanggal aman
  const formatPRDate = (pr: any) => {
    if (!pr) return '-'
    const rawDate = pr.pr_date || pr.request_date || pr.created_at || pr.date
    if (!rawDate) return '-'
    try {
      return new Date(rawDate).toISOString().split('T')[0]
    } catch {
      return String(rawDate)
    }
  }

  // Auto Focus ke Search Input saat dropdown dibuka
  useEffect(() => {
    if (isPrDropdownOpen && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus()
      }, 50)
    }
  }, [isPrDropdownOpen])

  // Close dropdown saat klik di luar area
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsPrDropdownOpen(false)
        setHoveredPr(null)
        setPrSearchTerm('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // 1. Fetch Master PR (Ambil semua kolom *) & Vendor
  useEffect(() => {
    async function fetchDataMaster() {
      setIsDataFetching(true)
      const { data: prData, error: prErr } = await supabase
        .from('purchase_requests')
        .select(`
          *,
          projects (
            project_name,
            customers (instansi_name)
          ),
          companies (company_name)
        `)
        .neq('status', 'Rejected')
        .order('created_at', { ascending: false })

      if (prErr) {
        console.error("Error fetching PRs:", prErr.message)
      } else if (prData) {
        setPrs(prData)
      }

      const { data: vendorsData, error: vendorErr } = await supabase
        .from('vendors')
        .select('id, vendor_name')
      
      if (vendorErr) {
        console.error("Error fetching vendors:", vendorErr.message)
      } else {
        setAllVendors(vendorsData || [])
      }
      setIsDataFetching(false)
    }
    fetchDataMaster()
  }, [supabase])

  // 2. Fetch Barang PR & Vendor yang HANYA TERELASI dengan PR
  useEffect(() => {
    if (!selectedPrId) {
      setPrItems([])
      setExistingPoVendorIds([])
      setFilteredVendors([])
      setActiveVendorIds([])
      setPoInputs({})
      return
    }

    async function fetchPRDetailsAndExistingPOs() {
      setLoading(true)
      
      const { data: itemsData } = await supabase
        .from('purchase_request_items')
        .select('*')
        .eq('pr_id', selectedPrId)

      const items = itemsData || []
      setPrItems(items)

      // Ambil daftar vendor_id yang ADA di dalam item PR terpilih saja
      const prVendorIds = Array.from(
        new Set(
          items
            .map((item: any) => String(item.vendor_id))
            .filter((id: string) => id && id !== 'null' && id !== 'undefined')
        )
      )

      // Ambil vendor_id yang SUDAH dibuatkan PO untuk PR ini
      const { data: existingPos } = await supabase
        .from('purchase_orders')
        .select('vendor_id')
        .eq('pr_id', selectedPrId)

      const usedVendorIds = (existingPos || []).map(po => String(po.vendor_id))
      setExistingPoVendorIds(usedVendorIds)

      // Filter: Hanya tampilkan vendor yang ADA di item PR dan BELUM terbit PO
      let available = []
      if (prVendorIds.length > 0) {
        available = allVendors.filter(v => prVendorIds.includes(String(v.id)) && !usedVendorIds.includes(String(v.id)))
      } else {
        available = allVendors.filter(v => !usedVendorIds.includes(String(v.id)))
      }

      setFilteredVendors(available)
      setActiveVendorIds([])
      setPoInputs({})
      setLoading(false)
    }

    fetchPRDetailsAndExistingPOs()
  }, [selectedPrId, allVendors, supabase])

  const selectedPrDetail = prs.find(p => String(p.id) === String(selectedPrId))

  // Filter PR berdasarkan Pencarian
  const filteredPrList = prs.filter((pr) => {
    const searchLower = prSearchTerm.toLowerCase()
    const prNum = (pr.pr_number || '').toLowerCase()
    const projName = (pr.projects?.project_name || '').toLowerCase()
    const custName = (pr.projects?.customers?.instansi_name || '').toLowerCase()
    return prNum.includes(searchLower) || projName.includes(searchLower) || custName.includes(searchLower)
  })

  const handleAddVendorCard = () => {
    if (!selectedVendorToAdd) return alert('Pilih vendor terlebih dahulu!')
    if (activeVendorIds.includes(selectedVendorToAdd)) {
      return alert('Card PO untuk vendor ini sudah ditambahkan.')
    }

    const today = new Date().toISOString().split('T')[0]

    setActiveVendorIds([...activeVendorIds, selectedVendorToAdd])
    setPoInputs((prev: any) => ({
      ...prev,
      [selectedVendorToAdd]: { po_number: '', po_date: today, file: null }
    }))
    setSelectedVendorToAdd('')
  }

  const handleRemoveVendorCard = (vendorId: string) => {
    setActiveVendorIds(activeVendorIds.filter(id => id !== vendorId))
    setPoInputs((prev: any) => {
      const copy = { ...prev }
      delete copy[vendorId]
      return copy
    })
  }

  const handleInputChange = (vId: string, field: string, value: any) => {
    setPoInputs((prev: any) => ({
      ...prev,
      [vId]: { ...prev[vId], [field]: value }
    }))
  }

  const handleSubmitAll = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return

    if (!selectedPrId) return alert('Pilih nomor PR terlebih dahulu!')
    if (activeVendorIds.length === 0) return alert('Minimal tambahkan 1 PO vendor!')

    for (const vId of activeVendorIds) {
      const vObj = allVendors.find(v => String(v.id) === String(vId))
      if (!poInputs[vId]?.po_number || poInputs[vId].po_number.trim() === '') {
        alert(`Nomor PO untuk vendor "${vObj?.vendor_name || 'Vendor'}" wajib diisi!`)
        return
      }
    }

    setLoading(true)

    try {
      for (const vId of activeVendorIds) {
        const vObj = allVendors.find(v => String(v.id) === String(vId))
        const { data: dbCheck } = await supabase
          .from('purchase_orders')
          .select('id')
          .eq('pr_id', selectedPrId)
          .eq('vendor_id', vId)
          .maybeSingle()

        if (dbCheck) {
          setDuplicateVendorName(vObj?.vendor_name || '')
          setIsDuplicateModalOpen(true)
          setLoading(false)
          return
        }
      }

      for (const vId of activeVendorIds) {
        const poData = poInputs[vId]
        let fileUrl = null

        if (poData.file) {
          const file = poData.file
          const fileExt = file.name.split('.').pop()
          const fileName = `po_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`
          
          const { data: uploadData, error: uploadErr } = await supabase.storage
            .from('po_documents')
            .upload(fileName, file)

          if (uploadErr) throw uploadErr
          fileUrl = uploadData.path
        }

        const vendorItems = prItems.filter(item => !item.vendor_id || String(item.vendor_id) === String(vId))
        const itemsToInsert = vendorItems.length > 0 ? vendorItems : prItems
        const totalPO = itemsToInsert.reduce((sum: number, item: any) => sum + Number(item.subtotal || 0), 0)

        // Ambil project_id dari PR yang terpilih
        const currentProjectId = selectedPrDetail?.project_id || null

        const { data: newPo, error: poErr } = await supabase
          .from('purchase_orders')
          .insert({
            pr_id: selectedPrId,
            vendor_id: vId,
            po_number: poData.po_number,
            po_date: poData.po_date || null,
            total_amount: totalPO,
            status: 'Released',
            document_url: fileUrl,
            project_id: currentProjectId // <--- PERBAIKAN: Menyertakan project_id agar tidak NULL di DB
          })
          .select().single()

        if (poErr) {
          const isDuplicate = poErr.code === '23505' || poErr.message?.toLowerCase().includes('duplicate') || poErr.message?.toLowerCase().includes('unique')
          if (isDuplicate) {
            const vObj = allVendors.find(v => String(v.id) === String(vId))
            setDuplicateVendorName(vObj?.vendor_name || '')
            setIsDuplicateModalOpen(true)
            setLoading(false)
            return
          }
          throw poErr
        }

        const poItems = itemsToInsert.map((item: any) => ({
          po_id: newPo.id,
          pr_item_id: item.id,
          item_name: item.item_name,
          brand: item.brand,
          model_type: item.model_type,
          specification: item.specification,
          quantity: item.quantity,
          unit: item.unit,
          unit_price: item.unit_price,
          subtotal: item.subtotal
        }))

        const { error: itemsErr } = await supabase
          .from('purchase_order_items')
          .insert(poItems)

        if (itemsErr) throw itemsErr
      }

      await supabase
        .from('purchase_requests')
        .update({ status: 'Approved' })
        .eq('id', selectedPrId)

      alert('PO berhasil terbit dan status PR otomatis diperbarui menjadi Approved!')
      router.push('/po')
    } catch (err: any) {
      const errMsg = err?.message?.toLowerCase() || ''
      const isDuplicate = err?.code === '23505' || errMsg.includes('duplicate') || errMsg.includes('unique')

      if (isDuplicate) {
        setIsDuplicateModalOpen(true)
      } else {
        alert('Gagal menerbitkan PO: ' + err.message)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-[95%] mx-auto space-y-6 pb-24">
      {/* MODAL POP-UP UI - PO SUDAH TERBIT */}
      {isDuplicateModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-5 border text-center relative">
            <button 
              type="button"
              onClick={() => setIsDuplicateModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-14 h-14 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-bold text-slate-900">PO Sudah Terbit!</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Purchase Order untuk referensi PR ini{duplicateVendorName ? ` dengan Vendor ` : ''} 
                {duplicateVendorName && <strong className="text-slate-800">{duplicateVendorName}</strong>} 
                telah diterbitkan sebelumnya.
              </p>
            </div>

            <div className="pt-2">
              <Button 
                type="button"
                onClick={() => setIsDuplicateModalOpen(false)} 
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium py-2 rounded-lg"
              >
                Mengerti & Tutup
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center">
        <Link href="/po">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" /> Kembali ke Daftar PO
          </Button>
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Buat Purchase Order (PO)</h1>
      </div>

      {/* CARD 1: PILIH REFERENSI PR */}
      <Card className="overflow-visible relative z-30">
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><FileText className="w-5 h-5 text-blue-600"/> Pilih Referensi Purchase Request (PR)</CardTitle></CardHeader>
        <CardContent className="overflow-visible relative">
          <div className="space-y-2 relative" ref={dropdownRef}>
            <Label>Nomor PR *</Label>
            
            {/* Custom Dropdown Trigger */}
            <div 
              onClick={() => setIsPrDropdownOpen(!isPrDropdownOpen)}
              className="w-full border rounded-md px-3 py-2.5 text-sm bg-white cursor-pointer flex justify-between items-center hover:border-blue-400 transition-colors shadow-sm"
            >
              <span className={selectedPrDetail ? 'font-medium text-slate-800' : 'text-slate-400'}>
                {selectedPrDetail 
                  ? `PR: ${selectedPrDetail.pr_number} (${selectedPrDetail.projects?.project_name || 'No Project'})` 
                  : isDataFetching ? 'Memuat data PR...' : '-- Pilih PR --'}
              </span>
              <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${isPrDropdownOpen ? 'rotate-180' : ''}`} />
            </div>

            {/* Custom Dropdown Container dengan Input Pencarian & Scroll Terkontrol */}
            {isPrDropdownOpen && (
              <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-2xl overflow-hidden flex flex-col">
                
                {/* BAR PENCARIAN NOMOR PR */}
                <div className="p-2 bg-slate-50 border-b border-slate-200 relative">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <Input 
                      ref={searchInputRef}
                      placeholder="Ketik untuk mencari nomor PR, project..."
                      value={prSearchTerm}
                      onChange={(e) => setPrSearchTerm(e.target.value)}
                      className="pl-9 h-9 text-xs bg-white border-slate-300 focus-visible:ring-1 focus-visible:ring-blue-500"
                    />
                    {prSearchTerm && (
                      <button 
                        type="button"
                        onClick={() => setPrSearchTerm('')}
                        className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* LIST PILIHAN PR */}
                <div className="max-h-52 overflow-y-auto divide-y divide-slate-100">
                  {filteredPrList.length === 0 ? (
                    <div className="p-4 text-xs text-slate-400 text-center">
                      {prSearchTerm ? 'Nomor PR / Keyword tidak ditemukan.' : isDataFetching ? 'Sedang mengambil data PR...' : 'Tidak ada data PR.'}
                    </div>
                  ) : (
                    filteredPrList.map((pr) => (
                      <div
                        key={pr.id}
                        onClick={() => {
                          setSelectedPrId(String(pr.id))
                          setIsPrDropdownOpen(false)
                          setHoveredPr(null)
                          setPrSearchTerm('')
                        }}
                        onMouseEnter={() => setHoveredPr(pr)}
                        onMouseLeave={() => setHoveredPr(null)}
                        className={`p-3 text-sm cursor-pointer transition-colors flex justify-between items-center ${
                          String(selectedPrId) === String(pr.id) 
                            ? 'bg-blue-50 text-blue-700 font-semibold' 
                            : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                          <span>PR: <strong>{pr.pr_number}</strong></span>
                          <span className="text-xs text-slate-400 truncate max-w-[200px]">({pr.projects?.project_name || 'No Project'})</span>
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded font-semibold border ${
                          pr.status === 'Approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-blue-50 text-blue-700 border-blue-200'
                        }`}>
                          {pr.status || 'Submitted'}
                        </span>
                      </div>
                    ))
                  )}
                </div>

                {/* RINGKASAN PREVIEW PR HOVER */}
                {hoveredPr && (
                  <div className="bg-slate-900 text-white p-3 border-t border-slate-700 text-xs animate-in fade-in duration-150 pointer-events-none">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 mb-2">
                      <span className="font-semibold text-blue-300 flex items-center gap-1.5 text-xs">
                        <Info className="w-3.5 h-3.5 text-blue-400" /> Ringkasan Informasi PR #{hoveredPr.pr_number}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-400/30 font-medium">
                        {hoveredPr.status || 'Submitted'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-[11px] text-slate-300">
                      <div className="bg-slate-800/80 p-2 rounded">
                        <span className="text-[10px] text-slate-400 block">Project</span>
                        <strong className="text-white truncate block">{hoveredPr.projects?.project_name || '-'}</strong>
                      </div>
                      <div className="bg-slate-800/80 p-2 rounded">
                        <span className="text-[10px] text-slate-400 block">Customer</span>
                        <strong className="text-white truncate block">{hoveredPr.projects?.customers?.instansi_name || '-'}</strong>
                      </div>
                      <div className="bg-slate-800/80 p-2 rounded">
                        <span className="text-[10px] text-slate-400 block">Company</span>
                        <strong className="text-white truncate block">{hoveredPr.companies?.company_name || '-'}</strong>
                      </div>
                      <div className="bg-slate-800/80 p-2 rounded">
                        <span className="text-[10px] text-slate-400 block">Tanggal PR</span>
                        <strong className="text-white">{formatPRDate(hoveredPr)}</strong>
                      </div>
                      <div className="bg-slate-800/80 p-2 rounded">
                        <span className="text-[10px] text-slate-400 block">Internal PIC</span>
                        <strong className="text-white">{hoveredPr.pic_internal || '-'}</strong>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* CARD PREVIEW RINGKASAN INFORMASI PR TERPILIH */}
      {selectedPrDetail && (
        <Card className="bg-blue-50/50 border-blue-200 shadow-sm relative z-10">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-blue-700 uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-blue-600" /> Ringkasan Informasi Referensi PR
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm pt-1">
              <div>
                <span className="text-xs text-slate-500 block font-medium">Nomor PR</span>
                <span className="font-bold text-slate-800">{selectedPrDetail.pr_number}</span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block font-medium">Tanggal PR</span>
                <span className="font-semibold text-slate-800">{formatPRDate(selectedPrDetail)}</span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block font-medium">Project</span>
                <span className="font-semibold text-slate-800">{selectedPrDetail.projects?.project_name || '-'}</span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block font-medium">Customer</span>
                <span className="font-semibold text-slate-800">{selectedPrDetail.projects?.customers?.instansi_name || '-'}</span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block font-medium">Company</span>
                <span className="font-semibold text-slate-800">{selectedPrDetail.companies?.company_name || '-'}</span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block font-medium">Internal PIC</span>
                <span className="font-semibold text-slate-800">{selectedPrDetail.pic_internal || '-'}</span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block font-medium">Status PR</span>
                <span className="inline-block px-2 py-0.5 text-xs font-semibold rounded bg-blue-100 text-blue-700 border border-blue-300">
                  {selectedPrDetail.status || 'Submitted'}
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block font-medium">Total Item Barang</span>
                <span className="font-bold text-blue-900">{prItems.length} Item Barang</span>
              </div>
            </div>

            {existingPoVendorIds.length > 0 && (
              <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-md text-amber-800 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Terdapat <strong>{existingPoVendorIds.length} Vendor</strong> yang PO-nya sudah terbit untuk PR ini.</span>
                </div>
                <span className="px-2 py-0.5 font-bold rounded bg-amber-200 text-amber-900 text-[10px]">
                  PO Sudah Terbit
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* CARD 2: PILIH VENDOR */}
      {selectedPrId && (
        <Card className="bg-slate-50/50 relative z-10">
          <CardHeader><CardTitle className="text-base">Pilih Vendor & Tambah PO</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3 items-end">
              <div className="flex-1 space-y-2">
                <Label>Pilih Vendor *</Label>
                <select 
                  className="w-full border rounded-md px-3 py-2 text-sm bg-white"
                  value={selectedVendorToAdd}
                  onChange={(e) => setSelectedVendorToAdd(e.target.value)}
                >
                  <option value="">-- Pilih Vendor --</option>
                  {filteredVendors.length === 0 ? (
                    <option value="" disabled>PO sudah terbit untuk seluruh vendor pada PR ini / Tidak ada vendor terikat</option>
                  ) : (
                    filteredVendors.map((vendor) => (
                      <option key={vendor.id} value={vendor.id}>{vendor.vendor_name}</option>
                    ))
                  )}
                </select>
              </div>
              <Button type="button" onClick={handleAddVendorCard} disabled={filteredVendors.length === 0}>
                <Plus className="w-4 h-4 mr-2" /> Tambah Card PO Vendor
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* FORM CARD PO PER VENDOR */}
      {selectedPrId && (
        <form onSubmit={handleSubmitAll} className="space-y-6 relative z-10">
          {activeVendorIds.length === 0 ? (
            <div className="text-center py-8 border border-dashed rounded-lg text-slate-400 bg-white">
              Belum ada vendor yang dipilih. Silakan pilih vendor di atas untuk memunculkan form PO.
            </div>
          ) : (
            activeVendorIds.map((vId) => {
              const vendorObj = allVendors.find(v => String(v.id) === String(vId))
              const vendorItems = prItems.filter(item => !item.vendor_id || String(item.vendor_id) === String(vId))
              const totalPO = vendorItems.reduce((sum: number, item: any) => sum + Number(item.subtotal || 0), 0)

              return (
                <Card key={vId} className="border-slate-300 shadow-sm relative">
                  <CardHeader className="bg-slate-100/80 rounded-t-lg py-3 flex flex-row justify-between items-center">
                    <CardTitle className="text-base font-bold text-slate-800">
                      Vendor: <span className="text-primary">{vendorObj?.vendor_name || 'Vendor'}</span>
                    </CardTitle>
                    <Button 
                      type="button" 
                      variant="destructive" 
                      size="sm" 
                      onClick={() => handleRemoveVendorCard(vId)}
                    >
                      <Trash2 className="w-4 h-4 mr-1" /> Hapus Card
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-6 pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-md border">
                      <div>
                        <Label className="text-xs font-semibold text-slate-600 uppercase">Nomor PO *</Label>
                        <Input 
                          placeholder="Masukkan nomor PO..."
                          value={poInputs[vId]?.po_number || ''}
                          onChange={(e) => handleInputChange(vId, 'po_number', e.target.value)}
                          required
                          className="mt-1 bg-white"
                        />
                      </div>
                      <div>
                        <Label className="text-xs font-semibold text-slate-600 uppercase">Tanggal PO *</Label>
                        <Input 
                          type="date"
                          value={poInputs[vId]?.po_date || ''}
                          onChange={(e) => handleInputChange(vId, 'po_date', e.target.value)}
                          required
                          className="mt-1 bg-white"
                        />
                      </div>
                      <div>
                        <Label className="text-xs font-semibold text-slate-600 uppercase">Dokumen PO Internal (PDF/Img)</Label>
                        <Input 
                          type="file" 
                          onChange={(e) => handleInputChange(vId, 'file', e.target.files?.[0])} 
                          className="mt-1 cursor-pointer bg-white"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-slate-600 uppercase">Barang dalam PO Ini:</Label>
                      <div className="border rounded-md bg-white overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow><TableHead className="w-12 text-center">No</TableHead><TableHead>Nama Barang</TableHead><TableHead>Brand</TableHead><TableHead>Model/Type</TableHead><TableHead>Spesifikasi</TableHead><TableHead className="text-center">Qty</TableHead><TableHead>Satuan</TableHead><TableHead className="text-right">Harga Satuan</TableHead><TableHead className="text-right">Subtotal</TableHead></TableRow>
                          </TableHeader>
                          <TableBody>
                            {vendorItems.map((item: any, idx: number) => (
                              <TableRow key={item.id || idx}><TableCell className="text-center">{idx + 1}</TableCell><TableCell className="font-medium">{item.item_name}</TableCell><TableCell>{item.brand || '-'}</TableCell><TableCell>{item.model_type || '-'}</TableCell><TableCell>{item.specification || '-'}</TableCell><TableCell className="text-center">{item.quantity}</TableCell><TableCell>{item.unit}</TableCell><TableCell className="text-right">Rp {Number(item.unit_price || 0).toLocaleString('id-ID')}</TableCell><TableCell className="text-right font-medium">Rp {Number(item.subtotal || 0).toLocaleString('id-ID')}</TableCell></TableRow>
                            ))}
                            {vendorItems.length === 0 && (
                              <TableRow><TableCell colSpan={9} className="text-center py-4 text-slate-400">Tidak ada item barang untuk vendor ini.</TableCell></TableRow>
                            )}
                            <TableRow className="bg-slate-50 font-bold"><TableCell colSpan={8} className="text-right uppercase">TOTAL PO VENDOR INI:</TableCell><TableCell className="text-right text-primary">Rp {totalPO.toLocaleString('id-ID')}</TableCell></TableRow>
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })
          )}

          {activeVendorIds.length > 0 && (
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => router.push('/po')}>Batal</Button>
              <Button type="submit" disabled={loading}>
                <Save className="w-4 h-4 mr-2" /> {loading ? 'Menerbitkan...' : 'Simpan Semua PO'}
              </Button>
            </div>
          )}
        </form>
      )}
    </div>
  )
}