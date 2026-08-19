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

export default function EditCustomerPage() {
  const params = useParams()
  const id = params.id as string

  const [formData, setFormData] = useState({
    instansi_name: '',
    pic_name: '',
    pic_contact: ''
  })
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    if (id) {
      fetchCustomer(id)
    }
  }, [id])

  const fetchCustomer = async (customerId: string) => {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('id', customerId)
      .single()

    if (error) {
      alert('Gagal memuat data customer')
      router.push('/customers')
    } else if (data) {
      setFormData({
        instansi_name: data.instansi_name || '',
        pic_name: data.pic_name || '',
        pic_contact: data.pic_contact || ''
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
        .from('customers')
        .update(formData)
        .eq('id', id)

      if (error) throw error

      alert('Customer berhasil diperbarui!')
      router.push('/customers')
    } catch (error: any) {
      alert(`Gagal memperbarui: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  if (fetching) {
    return <div className="p-6 text-center text-gray-500">Memuat data customer...</div>
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
          <CardTitle>Edit Customer</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Nama Perusahaan / Instansi</Label>
              <Input 
                required 
                value={formData.instansi_name}
                onChange={(e) => setFormData({...formData, instansi_name: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>Nama PIC</Label>
              <Input 
                value={formData.pic_name}
                onChange={(e) => setFormData({...formData, pic_name: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>Kontak PIC (No. Telp / Email)</Label>
              <Input 
                value={formData.pic_contact}
                onChange={(e) => setFormData({...formData, pic_contact: e.target.value})}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Menyimpan...' : 'Perbarui Customer'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}