'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { Pencil, Trash2, Plus } from 'lucide-react'

function DeleteCompanyButton({ id, onDeleteSuccess }: { id: string, onDeleteSuccess: (id: string) => void }) {
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const handleDelete = async () => {
    if (!confirm('Apakah Anda yakin ingin menghapus company ini?')) return
    setLoading(true)
    const { error } = await supabase.from('companies').delete().eq('id', id)
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

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function fetchCompanies() {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        alert('Gagal memuat data company: ' + error.message)
      }
      if (data) {
        setCompanies(data)
      }
      setLoading(false)
    }
    fetchCompanies()
  }, [supabase])

  const handleDeleteSuccess = (deletedId: string) => {
    setCompanies(companies.filter(c => c.id !== deletedId))
  }

  if (loading) {
    return <div className="p-6 text-center text-gray-500">Memuat data company...</div>
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">COMPANIES</h1>
          <p className="text-sm text-gray-500">Kelola daftar perusahaan</p>
        </div>
        <Button asChild>
          <Link href="/companies/add"><Plus className="w-4 h-4 mr-2" /> Tambah Company</Link>
        </Button>
      </div>

      <div className="border rounded-md bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Abbreviation / Kode</TableHead>
              <TableHead>Nama Perusahaan</TableHead>
              <TableHead>Alamat</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {companies.map((company: any) => {
              const abbrDisplay = company.abbreviation || company.code || company.short_name || '-'
              const nameDisplay = company.name || company.company_name || company.nama || '-'
              const addressDisplay = company.address || company.alamat || '-'
              
              // Logika status yang aman dan tidak menyebabkan error sintaks
              let isActive = true;
              if (typeof company.is_active === 'boolean') {
                isActive = company.is_active;
              } else if (company.status === 'Active') {
                isActive = true;
              } else {
                isActive = false;
              }

              return (
                <TableRow key={company.id}>
                  <TableCell className="font-semibold">{abbrDisplay}</TableCell>
                  <TableCell>{nameDisplay}</TableCell>
                  <TableCell>{addressDisplay}</TableCell>
                  <TableCell>
                    <Badge variant={isActive ? 'default' : 'secondary'}>
                      {isActive ? 'Aktif' : 'Non Aktif'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/companies/${company.id}/edit`} title="Edit"><Pencil className="w-4 h-4" /></Link>
                    </Button>
                    <DeleteCompanyButton id={company.id} onDeleteSuccess={handleDeleteSuccess} />
                  </TableCell>
                </TableRow>
              )
            })}
            {companies.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-6 text-gray-500">
                  Belum ada data company.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}