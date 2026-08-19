'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Plus, Eye, Search, RefreshCcw } from 'lucide-react'
import Link from 'next/link'

export default function PRIndexPage() {
  const supabase = createClient()
  const [prList, setPrList] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [searchQuery, setSearchQuery] = useState('')
  const [filterBy, setFilterBy] = useState('')

  const fetchPRs = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('purchase_requests')
      .select(`
        *,
        projects (project_name),
        companies (company_name)
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching PRs:', error.message)
    } else {
      setPrList(data || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchPRs()
  }, [supabase])

  const handleStatusUpdate = async (prId: string, newStatus: string) => {
    const { error } = await supabase
      .from('purchase_requests')
      .update({ status: newStatus })
      .eq('id', prId)

    if (error) {
      alert('Gagal merubah status PR: ' + error.message)
    } else {
      setPrList(prev => prev.map(pr => pr.id === prId ? { ...pr, status: newStatus } : pr))
    }
  }

  const filteredPRs = prList.filter((pr) => {
    const prNum = pr.pr_number?.toLowerCase() || ''
    const status = pr.status?.toLowerCase() || ''
    const projectName = pr.projects?.project_name?.toLowerCase() || ''
    const companyName = pr.companies?.company_name?.toLowerCase() || ''
    const query = searchQuery.toLowerCase()

    const matchesSearch = 
      prNum.includes(query) || 
      status.includes(query) ||
      projectName.includes(query) || 
      companyName.includes(query)

    let matchesFilter = true
    if (filterBy) {
      if (filterBy.startsWith('status_')) {
        const val = filterBy.replace('status_', '')
        matchesFilter = pr.status === val
      }
    }

    return matchesSearch && matchesFilter
  })

  const handleResetFilter = () => {
    setSearchQuery('')
    setFilterBy('')
  }

  return (
    <div className="p-6 max-w-[95%] mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">Daftar Purchase Request (PR)</h1>
        <Link href="/pr/add">
          <Button>
            <Plus className="w-4 h-4 mr-2" /> Buat PR Baru
          </Button>
        </Link>
      </div>

      <div className="bg-slate-50 p-4 rounded-lg border space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label className="text-xs font-semibold text-slate-600 uppercase">Search</Label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Cari PR, Project, atau Company..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-white"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-semibold text-slate-600 uppercase">Filter by Status</Label>
            <select 
              className="w-full border rounded-md px-3 py-2 text-sm bg-white h-10"
              value={filterBy}
              onChange={(e) => setFilterBy(e.target.value)}
            >
              <option value="">Semua Status</option>
              <option value="status_Submitted">Submitted (Biru)</option>
              <option value="status_Approved">Approved (Hijau)</option>
              <option value="status_Rejected">Rejected (Merah)</option>
            </select>
          </div>
        </div>

        <div className="flex justify-between items-center pt-2 border-t">
          <div className="text-xs text-slate-500">
            Menampilkan <span className="font-semibold text-slate-800">{filteredPRs.length}</span> dari {prList.length} total data PR
          </div>
          <Button variant="outline" size="sm" onClick={handleResetFilter}>
            <RefreshCcw className="w-3.5 h-3.5 mr-1.5" /> Reset Filter
          </Button>
        </div>
      </div>

      <div className="border rounded-md bg-white overflow-x-auto shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12 text-center">No</TableHead>
              <TableHead>Nomor PR</TableHead>
              <TableHead>Tanggal PR</TableHead>
              <TableHead>Project</TableHead>
              <TableHead>Company</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-center w-20">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-slate-400">Memuat data...</TableCell>
              </TableRow>
            ) : filteredPRs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-slate-400">Tidak ada data Purchase Request.</TableCell>
              </TableRow>
            ) : (
              filteredPRs.map((pr, index) => (
                <TableRow key={pr.id}>
                  <TableCell className="text-center font-medium text-slate-500">{index + 1}</TableCell>
                  <TableCell className="font-semibold">{pr.pr_number || '-'}</TableCell>
                  <TableCell>{pr.pr_date || pr.created_at?.split('T')[0] || '-'}</TableCell>
                  <TableCell>{pr.projects?.project_name || '-'}</TableCell>
                  <TableCell>{pr.companies?.company_name || '-'}</TableCell>
                  
                  <TableCell className="text-center">
                    <select
                      className={`text-xs font-semibold px-2.5 py-1 rounded-md border bg-white cursor-pointer transition-colors ${
                        pr.status === 'Approved' ? 'text-green-700 border-green-300 bg-green-50' :
                        pr.status === 'Rejected' ? 'text-red-700 border-red-300 bg-red-50' :
                        'text-blue-700 border-blue-300 bg-blue-50' // Submitted
                      }`}
                      value={pr.status || 'Submitted'}
                      onChange={(e) => handleStatusUpdate(pr.id, e.target.value)}
                    >
                      <option value="Submitted">Submitted</option>
                      <option value="Approved">Approved</option>
                      <option value="Rejected">Rejected</option>
                    </select>
                  </TableCell>
                  
                  <TableCell className="text-center">
                    <Link href={`/pr/${pr.id}`}>
                      <Button variant="ghost" size="icon" title="Lihat Detail PR"><Eye className="w-4 h-4 text-blue-600" /></Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}