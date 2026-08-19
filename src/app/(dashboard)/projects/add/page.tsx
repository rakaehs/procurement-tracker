'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function AddProjectPage() {
  const [companies, setCompanies] = useState<any[]>([])
  const [customers, setCustomers] = useState<any[]>([])
  const [formData, setFormData] = useState({ 
    company_id: '', 
    project_name: '', 
    customer_id: '', 
    internal_pic: '', 
    status: 'Planning' 
  })
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function loadData() {
      const { data: c } = await supabase.from('companies').select('id, abbreviation').eq('is_active', true)
      const { data: cust } = await supabase.from('customers').select('id, instansi_name')
      if (c) setCompanies(c)
      if (cust) setCustomers(cust)
    }
    loadData()
  }, [supabase])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { error } = await supabase.from('projects').insert([formData])
      if (error) throw error

      alert('Project berhasil ditambahkan!')
      router.push('/projects')
    } catch (error: any) {
      alert(`Gagal menyimpan: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-xl mx-auto space-y-6">
      <Button variant="outline" size="sm" asChild>
        <Link href="/projects">
          <ArrowLeft className="w-4 h-4 mr-2" /> Kembali
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Tambah Project Baru</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Perusahaan</Label>
              <select 
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                required
                onChange={e => setFormData({...formData, company_id: e.target.value})}
              >
                <option value="">Pilih Perusahaan</option>
                {companies.map(c => <option key={c.id} value={c.id}>{c.abbreviation}</option>)}
              </select>
            </div>

            <div className="space-y-2">
              <Label>Nama Project</Label>
              <Input 
                required
                placeholder="Contoh: Implementasi Sistem ERP" 
                onChange={e => setFormData({...formData, project_name: e.target.value})} 
              />
            </div>

            <div className="space-y-2">
              <Label>Klien</Label>
              <select 
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                onChange={e => setFormData({...formData, customer_id: e.target.value})}
              >
                <option value="">Pilih Klien</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.instansi_name}</option>)}
              </select>
            </div>

            <div className="space-y-2">
              <Label>PIC Internal</Label>
              <Input 
                placeholder="Nama PIC internal" 
                onChange={e => setFormData({...formData, internal_pic: e.target.value})} 
              />
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <select 
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                value={formData.status}
                onChange={e => setFormData({...formData, status: e.target.value})}
              >
                <option value="Planning">Planning</option>
                <option value="On Going">On Going</option>
                <option value="Close">Close</option>
              </select>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Menyimpan...' : 'Simpan Project'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}