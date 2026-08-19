'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

export default function DeleteProjectButton({ id }: { id: string }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleDelete = async () => {
    if (!confirm('Hapus proyek ini?')) return
    setLoading(true)
    const { error } = await supabase.from('projects').delete().eq('id', id)
    setLoading(false)
    if (error) alert(error.message)
    else router.refresh()
  }

  return (
    <Button variant="destructive" size="sm" onClick={handleDelete} disabled={loading}>
      {loading ? '...' : 'Hapus'}
    </Button>
  )
}