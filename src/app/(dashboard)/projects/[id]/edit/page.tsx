'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Save } from 'lucide-react'
import Link from 'next/link'

export default function EditProjectPage() {
  const { id } = useParams()
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(false)
  const [companies, setCompanies] = useState<any[]>([])
  const [customers, setCustomers] = useState<any[]>([])
  
  const [formData, setFormData] = useState({
    project_name: '',
    customer_id: '',
    company_id: '',
    pic_internal: '',
    notes: ''
  })

  useEffect(() => {
    async function fetchData() {
      // 1. Fetch Master Data
      const { data: comp } = await supabase.from('companies').select('*')
      const { data: cust } = await supabase.from('customers').select('*')
      if (comp) setCompanies(comp)
      if (cust) setCustomers(cust)

      // 2. Fetch Existing Project
      const { data: proj } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .single()
      
      if (proj) {
        setFormData({
          project_name: proj.project_name || '',
          customer_id: proj.customer_id || '',
          company_id: proj.company_id || '',
          pic_internal: proj.pic_internal || '',
          notes: proj.notes || ''
        })
      }
    }
    fetchData()
  }, [id, supabase])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { error } = await supabase
        .from('projects')
        .update({
          project_name: formData.project_name,
          customer_id: formData.customer_id || null,
          company_id: formData.company_id || null,
          pic_internal: formData.pic_internal,
          notes: formData.notes
        })
        .eq('id', id)

      if (error) throw error

      alert('Project berhasil diperbarui!')
      router.push(`/projects/${id}`)
    } catch (error: any) {
      alert(`Gagal update: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <Link href={`/projects/${id}`}><Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4"/> Kembali ke Detail</Button></Link>
      
      <Card>
        <CardHeader><CardTitle>Edit Project</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Nama Project</Label>
              <Input required value={formData.project_name} onChange={e => setFormData({...formData, project_name: e.target.value})} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Customer</Label>
                <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm" value={formData.customer_id} onChange={e => setFormData({...formData, customer_id: e.target.value})}>
                  <option value="">Pilih Customer</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.instansi_name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Company</Label>
                <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm" value={formData.company_id} onChange={e => setFormData({...formData, company_id: e.target.value})}>
                  <option value="">Pilih Company</option>
                  {companies.map(c => <option key={c.id} value={c.id}>{c.name || c.company_name}</option>)}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>PIC Internal</Label>
              <Input value={formData.pic_internal} onChange={e => setFormData({...formData, pic_internal: e.target.value})} />
            </div>

            <div className="space-y-2">
              <Label>Catatan</Label>
              <Input value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Menyimpan...' : <><Save className="mr-2 h-4 w-4"/> Simpan Perubahan</>}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}