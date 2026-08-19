'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Pencil, Trash2, Plus } from 'lucide-react'

function DeleteCustomerButton({ id, onDeleteSuccess }: { id: string, onDeleteSuccess: (id: string) => void }) {
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const handleDelete = async () => {
    if (!confirm('Apakah Anda yakin ingin menghapus customer ini?')) return
    setLoading(true)
    const { error } = await supabase.from('customers').delete().eq('id', id)
    setLoading(false)

    if (error) {
      alert(`Gagal menghapus: ${error.message}`)
    } else {
      onDeleteSuccess(id)
    }
  }

  return (
    <Button variant="ghost" size="sm" onClick={handleDelete} disabled={loading} className="text-red-600 hover:text-red-800">
      <Trash2 className="w-4 h-4" />
    </Button>
  )
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function fetchCustomers() {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        alert('Gagal memuat data customer: ' + error.message)
      }
      if (data) {
        console.log('Fetched Customers:', data) // Cek console jika masih kosong
        setCustomers(data)
      }
      setLoading(false)
    }
    fetchCustomers()
  }, [supabase])

  const handleDeleteSuccess = (deletedId: string) => {
    setCustomers(customers.filter(c => c.id !== deletedId))
  }

  if (loading) {
    return <div className="p-6 text-center text-gray-500">Memuat data customer...</div>
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">CUSTOMERS</h1>
          <p className="text-sm text-gray-500">Kelola daftar customer</p>
        </div>
        <Button asChild>
          <Link href="/customers/add"><Plus className="w-4 h-4 mr-2" /> Tambah Customer</Link>
        </Button>
      </div>

      <div className="border rounded-md bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama Customer / Instansi</TableHead>
              <TableHead>Contact Person / PIC</TableHead>
              <TableHead>Telepon</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.map((cust: any) => {
              // Mengakomodasi berbagai kemungkinan nama kolom pada tabel customer
              const nameDisplay = cust.instansi_name || cust.customer_name || cust.name || cust.company_name || '-'
              const picDisplay = cust.contact_person || cust.pic_name || cust.pic || '-'
              const phoneDisplay = cust.phone || cust.pic_contact || cust.phone_number || cust.telp || '-'
              const emailDisplay = cust.email || '-'

              return (
                <TableRow key={cust.id}>
                  <TableCell className="font-semibold">{nameDisplay}</TableCell>
                  <TableCell>{picDisplay}</TableCell>
                  <TableCell>{phoneDisplay}</TableCell>
                  <TableCell>{emailDisplay}</TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/customers/${cust.id}/edit`} title="Edit"><Pencil className="w-4 h-4" /></Link>
                    </Button>
                    <DeleteCustomerButton id={cust.id} onDeleteSuccess={handleDeleteSuccess} />
                  </TableCell>
                </TableRow>
              )
            })}
            {customers.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-6 text-gray-500">
                  Belum ada data customer.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}