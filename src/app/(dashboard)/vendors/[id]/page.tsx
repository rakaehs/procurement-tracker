'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { ArrowLeft, Trash2, Edit, Save, X } from 'lucide-react'

export default function VendorDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    vendor_name: '',
    vendor_pic: '',
    address: '',
    phone: '',
    email: '',
    notes: ''
  })

  useEffect(() => {
    async function fetchVendor() {
      const { data, error } = await supabase.from('vendors').select('*').eq('id', id).single()
      if (error) {
        alert('Gagal mengambil data vendor')
        router.push('/vendors')
      } else {
        setFormData(data)
      }
      setLoading(false)
    }
    fetchVendor()
  }, [id, router, supabase])

  const handleUpdate = async () => {
    setLoading(true)
    const { error } = await supabase.from('vendors').update({
      vendor_name: formData.vendor_name,
      vendor_pic: formData.vendor_pic,
      address: formData.address,
      phone: formData.phone,
      email: formData.email,
      notes: formData.notes
    }).eq('id', id)

    if (error) {
      alert(`Gagal update: ${error.message}`)
    } else {
      alert('Data berhasil diupdate!')
      setIsEditing(false)
    }
    setLoading(false)
  }

  const handleDelete = async () => {
    if (!confirm('Apakah Anda yakin ingin menghapus vendor ini? Data tidak bisa dikembalikan.')) return
    
    setLoading(true)
    const { error } = await supabase.from('vendors').delete().eq('id', id)
    
    if (error) {
      alert(`Gagal hapus: ${error.message}`)
    } else {
      alert('Vendor berhasil dihapus!')
      router.push('/vendors')
    }
    setLoading(false)
  }

  if (loading) return <div className="p-6">Memuat data...</div>

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <Link href="/vendors">
        <Button variant="outline" size="sm">
          <ArrowLeft className="w-4 h-4 mr-2" /> Kembali ke Daftar
        </Button>
      </Link>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{isEditing ? 'Edit Data Vendor' : 'Detail Vendor'}</CardTitle>
          <div className="space-x-2">
            {!isEditing ? (
              <Button onClick={() => setIsEditing(true)} size="sm"><Edit className="w-4 h-4 mr-2"/> Edit</Button>
            ) : (
              <Button variant="outline" onClick={() => setIsEditing(false)} size="sm"><X className="w-4 h-4 mr-2"/> Batal</Button>
            )}
            <Button variant="destructive" onClick={handleDelete} size="sm"><Trash2 className="w-4 h-4 mr-2"/> Hapus</Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          
          <div className="space-y-2">
            <Label>Nama Vendor</Label>
            <Input value={formData.vendor_name} disabled={!isEditing} onChange={e => setFormData({...formData, vendor_name: e.target.value})} />
          </div>

          <div className="space-y-2">
            <Label>PIC Vendor</Label>
            <Input value={formData.vendor_pic} disabled={!isEditing} onChange={e => setFormData({...formData, vendor_pic: e.target.value})} />
          </div>

          <div className="space-y-2">
            <Label>Alamat</Label>
            <Input value={formData.address} disabled={!isEditing} onChange={e => setFormData({...formData, address: e.target.value})} />
          </div>

          <div className="space-y-2">
            <Label>Nomor Telepon</Label>
            <Input value={formData.phone} disabled={!isEditing} onChange={e => setFormData({...formData, phone: e.target.value})} />
          </div>

          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={formData.email} disabled={!isEditing} onChange={e => setFormData({...formData, email: e.target.value})} />
          </div>

          <div className="space-y-2">
            <Label>Catatan</Label>
            <Input value={formData.notes} disabled={!isEditing} onChange={e => setFormData({...formData, notes: e.target.value})} />
          </div>

          {isEditing && (
            <Button className="w-full mt-4" onClick={handleUpdate} disabled={loading}>
              {loading ? 'Menyimpan...' : <><Save className="w-4 h-4 mr-2"/> Simpan Perubahan</>}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}