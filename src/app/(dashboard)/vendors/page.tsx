'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import Link from 'next/link'
import { Plus, Eye } from 'lucide-react'

export default function VendorsPage() {
  const supabase = createClient()
  const [vendors, setVendors] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchVendors() {
      const { data, error } = await supabase.from('vendors').select('*')
      if (data) setVendors(data)
      setLoading(false)
    }
    fetchVendors()
  }, [supabase])

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Data Vendor</h1>
        <Link href="/vendors/add">
          <Button><Plus className="w-4 h-4 mr-2" /> Tambah Vendor</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Vendor</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>No</TableHead>
                  <TableHead>Nama Vendor</TableHead>
                  <TableHead>PIC Vendor</TableHead>
                  <TableHead>Telepon</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="text-center">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={6} className="text-center">Memuat...</TableCell></TableRow>
                ) : vendors.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center">Data vendor kosong.</TableCell></TableRow>
                ) : (
                  vendors.map((vendor, index) => (
                    <TableRow key={vendor.id}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell className="font-medium">{vendor.vendor_name}</TableCell>
                      <TableCell>{vendor.vendor_pic || '-'}</TableCell>
                      <TableCell>{vendor.phone || '-'}</TableCell>
                      <TableCell>{vendor.email || '-'}</TableCell>
                      <TableCell className="text-center">
                        {/* Tombol dengan ikon mata saja */}
                        <Link href={`/vendors/${vendor.id}`}>
                          <Button variant="ghost" size="icon">
                            <Eye className="w-4 h-4" />
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}