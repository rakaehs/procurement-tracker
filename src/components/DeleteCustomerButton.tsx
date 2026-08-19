'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

export default function DeleteCustomerButton({ id }: { id: string }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleDelete = async () => {
    if (!confirm('Apakah Anda yakin ingin menghapus customer ini?')) return
    
    setLoading(true)
    const { error } = await supabase.from('customers').delete().eq('id', id)
    setLoading(false)

    if (error) {
      alert(`Gagal menghapus: ${error.message}`)
    } else {
      router.refresh()
    }
  }

  return (
    <Button variant="destructive" size="sm" onClick={handleDelete} disabled={loading}>
      {loading ? 'Menghapus...' : 'Hapus'}
    </Button>
  )
}