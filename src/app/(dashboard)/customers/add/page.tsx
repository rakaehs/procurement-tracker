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

export default function AddCustomerPage() {
  const [formData, setFormData] = useState({
    instansi_name: '',
    pic_name: '',
    pic_contact: ''
  })
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { error } = await supabase.from('customers').insert([formData])
      if (error) throw error

      alert('Customer berhasil ditambahkan!')
      router.push('/customers')
    } catch (error: any) {
      alert(`Gagal menyimpan: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <Button variant="outline" size="sm" asChild>
        <Link href="/customers">
          <ArrowLeft className="w-4 h-4 mr-2" /> Kembali
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Tambah Customer Baru</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Nama Perusahaan / Instansi</Label>
              <Input 
                required 
                placeholder="Contoh: PT Telkom Indonesia" 
                value={formData.instansi_name}
                onChange={(e) => setFormData({...formData, instansi_name: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>Nama PIC</Label>
              <Input 
                placeholder="Contoh: Budi Santoso" 
                value={formData.pic_name}
                onChange={(e) => setFormData({...formData, pic_name: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>Kontak PIC (No. Telp / Email)</Label>
              <Input 
                placeholder="Contoh: 08123456789 / budi@email.com" 
                value={formData.pic_contact}
                onChange={(e) => setFormData({...formData, pic_contact: e.target.value})}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Menyimpan...' : 'Simpan Customer'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}