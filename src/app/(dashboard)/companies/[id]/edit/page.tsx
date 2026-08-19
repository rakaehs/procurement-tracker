'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function EditCompanyPage() {
  const params = useParams()
  const id = params.id as string // Mengambil ID dari URL secara langsung

  const [formData, setFormData] = useState({
    company_name: '',
    abbreviation: '',
    notes: '',
    is_active: true
  })
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    if (id) {
      fetchCompany(id)
    }
  }, [id])

  const fetchCompany = async (companyId: string) => {
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .eq('id', companyId)
      .single()

    if (error) {
      alert('Gagal memuat data perusahaan')
      router.push('/companies')
    } else if (data) {
      setFormData({
        company_name: data.company_name || '',
        abbreviation: data.abbreviation || '',
        notes: data.notes || '',
        is_active: data.is_active ?? true
      })
    }
    setFetching(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id) return
    setLoading(true)

    try {
      const { error } = await supabase
        .from('companies')
        .update(formData)
        .eq('id', id)

      if (error) throw error

      alert('Perusahaan berhasil diperbarui!')
      router.push('/companies')
    } catch (error: any) {
      alert(`Gagal memperbarui: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  if (fetching) {
    return <div className="p-6 text-center text-gray-500">Memuat data perusahaan...</div>
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <Button variant="outline" size="sm" asChild>
        <Link href="/companies">
          <ArrowLeft className="w-4 h-4 mr-2" /> Kembali
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Edit Perusahaan</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Nama Company</Label>
              <Input 
                required 
                value={formData.company_name}
                onChange={(e) => setFormData({...formData, company_name: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>Singkatan</Label>
              <Input 
                required 
                value={formData.abbreviation}
                onChange={(e) => setFormData({...formData, abbreviation: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>Catatan</Label>
              <Input 
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>Status Aktif / Non Aktif</Label>
              <select 
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                value={formData.is_active ? 'true' : 'false'}
                onChange={(e) => setFormData({...formData, is_active: e.target.value === 'true'})}
              >
                <option value="true">Aktif</option>
                <option value="false">Non Aktif</option>
              </select>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Menyimpan...' : 'Perbarui Perusahaan'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}