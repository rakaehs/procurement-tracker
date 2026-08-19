'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function AddPaymentPage() {
  const [invoices, setInvoices] = useState<any[]>([])
  const [selectedInv, setSelectedInv] = useState<any>(null)

  const [formData, setFormData] = useState({
    invoice_id: '',
    payment_date: '',
    amount: '',
    payment_method: 'Bank Transfer',
    reference_number: '',
    notes: ''
  })
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function fetchInvoices() {
      const { data } = await supabase.from('invoices').select('*, vendors(vendor_name)')
      if (data) setInvoices(data)
    }
    fetchInvoices()
  }, [supabase])

  const handleInvoiceChange = (invId: string) => {
    setFormData({...formData, invoice_id: invId})
    const found = invoices.find(i => i.id === invId)
    if (found) setSelectedInv(found)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedInv) return
    setLoading(true)

    const payAmount = parseFloat(formData.amount) || 0
    const newTotalPaid = (Number(selectedInv.total_paid) || 0) + payAmount
    const newOutstanding = Number(selectedInv.invoice_value) - newTotalPaid
    const newPercentage = (newTotalPaid / Number(selectedInv.invoice_value)) * 100

    let newStatus = selectedInv.status
    if (newOutstanding <= 0) {
      newStatus = 'Paid'
    } else if (newTotalPaid > 0) {
      newStatus = 'Partial Paid'
    }

    try {
      const { error: payError } = await supabase.from('payments').insert([formData])
      if (payError) throw payError

      const { error: invError } = await supabase.from('invoices').update({
        total_paid: newTotalPaid,
        outstanding: newOutstanding > 0 ? newOutstanding : 0,
        payment_percentage: newPercentage,
        status: newStatus
      }).eq('id', selectedInv.id)

      if (invError) throw invError

      alert('Pembayaran berhasil dicatat!')
      router.push('/payments')
    } catch (error: any) {
      alert(`Gagal menyimpan: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <Button variant="outline" size="sm" asChild>
        <Link href="/payments">
          <ArrowLeft className="w-4 h-4 mr-2" /> Kembali
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Catat Pembayaran Baru</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Pilih Invoice Tagihan</Label>
              <select 
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                required
                value={formData.invoice_id}
                onChange={(e) => handleInvoiceChange(e.target.value)}
              >
                <option value="">Pilih Invoice</option>
                {invoices.map(inv => (
                  <option key={inv.id} value={inv.id}>
                    {inv.invoice_number} ({inv.vendors?.vendor_name}) - Sisa: Rp {Number(inv.outstanding).toLocaleString('id-ID')}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tanggal Pembayaran</Label>
                <Input 
                  type="date" 
                  required 
                  value={formData.payment_date}
                  onChange={(e) => setFormData({...formData, payment_date: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>Nominal Bayar (Rp)</Label>
                <Input 
                  type="number" 
                  required 
                  placeholder="Contoh: 200000000" 
                  value={formData.amount}
                  onChange={(e) => setFormData({...formData, amount: e.target.value})}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Metode Pembayaran</Label>
                <Input 
                  placeholder="Contoh: Bank Transfer / Giro" 
                  value={formData.payment_method}
                  onChange={(e) => setFormData({...formData, payment_method: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>Nomor Referensi / TRF</Label>
                <Input 
                  placeholder="Nomor referensi bank" 
                  value={formData.reference_number}
                  onChange={(e) => setFormData({...formData, reference_number: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Catatan</Label>
              <Input 
                placeholder="Catatan tambahan" 
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Menyimpan...' : 'Simpan & Proses Pembayaran'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}