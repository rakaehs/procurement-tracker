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

export default function AddVendorPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)

  const [formData, setFormData] = useState({
    vendor_name: '',
    vendor_pic: '',
    address: '',
    phone: '',
    email: '',
    notes: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { error } = await supabase.from('vendors').insert({
        vendor_name: formData.vendor_name.trim(),
        vendor_pic: formData.vendor_pic.trim() || null,
        address: formData.address.trim() || null,
        phone: formData.phone.trim() || null,
        email: formData.email.trim() || null,
        notes: formData.notes.trim() || null,
        is_active: true
      })

      if (error) throw error

      alert('Vendor baru berhasil ditambahkan!')
      router.push('/vendors')
    } catch (error: any) {
      alert(`Gagal menyimpan vendor: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <Link href="/vendors">
        <Button variant="outline" size="sm">
          <ArrowLeft className="w-4 h-4 mr-2" /> Kembali
        </Button>
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>Tambah Vendor Baru</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            
            <div className="space-y-2">
              <Label>Nama Vendor / Supplier</Label>
              <Input 
                required 
                placeholder="Contoh: PT Teknologi Nusantara" 
                value={formData.vendor_name} 
                onChange={e => setFormData({...formData, vendor_name: e.target.value})} 
              />
            </div>

            <div className="space-y-2">
              <Label>PIC Vendor</Label>
              <Input 
                placeholder="Nama narahubung vendor" 
                value={formData.vendor_pic} 
                onChange={e => setFormData({...formData, vendor_pic: e.target.value})} 
              />
            </div>

            <div className="space-y-2">
              <Label>Alamat</Label>
              <Input 
                placeholder="Alamat kantor vendor" 
                value={formData.address} 
                onChange={e => setFormData({...formData, address: e.target.value})} 
              />
            </div>

            <div className="space-y-2">
              <Label>Nomor Telepon</Label>
              <Input 
                placeholder="Contoh: 08123456789" 
                value={formData.phone} 
                onChange={e => setFormData({...formData, phone: e.target.value})} 
              />
            </div>

            <div className="space-y-2">
              <Label>Email</Label>
              <Input 
                type="email"
                placeholder="Contoh: info@vendor.com" 
                value={formData.email} 
                onChange={e => setFormData({...formData, email: e.target.value})} 
              />
            </div>

            <div className="space-y-2">
              <Label>Catatan</Label>
              <Input 
                placeholder="Catatan tambahan" 
                value={formData.notes} 
                onChange={e => setFormData({...formData, notes: e.target.value})} 
              />
            </div>

            <Button type="submit" className="w-full mt-4" disabled={loading}>
              {loading ? 'Menyimpan...' : 'Simpan Vendor'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}