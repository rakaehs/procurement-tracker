'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Eye } from 'lucide-react'

export default function ProjectsPage() {
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    async function fetchProjects() {
      // Memperbaiki query relasi companies hanya memanggil kolom yang valid (company_name)
      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          companies(company_name, abbreviation),
          customers(instansi_name),
          invoices(amount, payments(amount))
        `)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching projects:', error.message)
        setErrorMessage(error.message)
      } else {
        setProjects(data || [])
      }
      setLoading(false)
    }
    fetchProjects()
  }, [supabase])

  const getProjectStatus = (project: any) => {
    const invoices = project.invoices || []
    if (invoices.length === 0) return "On Going"
    const allPaid = invoices.every((inv: any) => {
      const totalPaid = (inv.payments || []).reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0)
      return totalPaid >= Number(inv.amount || 0)
    })
    return allPaid ? "Done" : "On Going"
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">DAFTAR PROJECT</h1>
      
      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
          <strong>Gagal memuat relasi data:</strong> {errorMessage}
        </div>
      )}

      <Card>
        <CardHeader><CardTitle>Informasi Project</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-slate-500">Memuat data...</p>
          ) : (
            <div className="border rounded-md bg-white">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">No</TableHead>
                    <TableHead>Nama Project</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>PIC Internal</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-center">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projects.map((p, index) => (
                    <TableRow key={p.id}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell className="font-semibold">{p.project_name}</TableCell>
                      <TableCell>{p.customers?.instansi_name || '-'}</TableCell>
                      <TableCell>{p.companies?.abbreviation || p.companies?.company_name || '-'}</TableCell>
                      <TableCell>{p.pic_internal || '-'}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={getProjectStatus(p) === 'Done' ? 'default' : 'secondary'}>
                          {getProjectStatus(p)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Button asChild variant="ghost" size="sm">
                          <Link href={`/projects/${p.id}`}><Eye className="w-4 h-4" /></Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {projects.length === 0 && !errorMessage && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-6 text-slate-400">
                        Belum ada project yang tersimpan.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}