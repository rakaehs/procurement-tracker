'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

export default function DeletePRButton({ id }: { id: string }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleDelete = async () => {
    if (!confirm('Hapus PR ini?')) return
    setLoading(true)
    await supabase.from('purchase_requests').delete().eq('id', id)
    setLoading(false)
    router.refresh()
  }

  return (
    <Button variant="destructive" size="sm" onClick={handleDelete} disabled={loading}>
      {loading ? '...' : 'Hapus'}
    </Button>
  )
}