'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function AddCompanyPage() {
  const [formData, setFormData] = useState({
    company_name: '',
    abbreviation: '',
    notes: '',
    is_active: true
  })
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { error } = await supabase.from('companies').insert([formData])
      if (error) throw error

      alert('Perusahaan berhasil ditambahkan!')
      router.push('/companies')
    } catch (error: any) {
      alert(`Gagal menyimpan: ${error.message}`)
    } finally {
      setLoading(false)
    }
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
          <CardTitle>Tambah Perusahaan Baru</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Nama Company</Label>
              <Input 
                required 
                placeholder="Contoh: PT ABC Indonesia" 
                value={formData.company_name}
                onChange={(e) => setFormData({...formData, company_name: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>Singkatan</Label>
              <Input 
                required 
                placeholder="Contoh: PT ABC" 
                value={formData.abbreviation}
                onChange={(e) => setFormData({...formData, abbreviation: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>Catatan</Label>
              <Input 
                placeholder="Catatan tambahan (opsional)" 
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
              {loading ? 'Menyimpan...' : 'Simpan Perusahaan'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}