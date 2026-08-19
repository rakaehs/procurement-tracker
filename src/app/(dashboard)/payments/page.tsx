import { createClient } from '@/lib/supabase/server'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default async function PaymentsPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  const { data: userData } = await supabase
    .from('users')
    .select('role')
    .eq('id', user?.id)
    .single()

  const isOperator = userData?.role === 'operator'

  const { data: payments } = await supabase
    .from('payments')
    .select(`
      *,
      invoices (invoice_number, invoice_value)
    `)
    .order('created_at', { ascending: false })

  const formatIDR = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount || 0)
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Payment History</h1>
          <p className="text-sm text-gray-500">Riwayat pembayaran transfer/giro untuk setiap invoice</p>
        </div>
        {isOperator && (
          <Button asChild>
            <Link href="/payments/add">+ Add Payment</Link>
          </Button>
        )}
      </div>

      <div className="border rounded-md bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Payment Date</TableHead>
              <TableHead>Invoice Ref</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Reference Number</TableHead>
              <TableHead>Amount Paid</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments?.map((pay: any) => (
              <TableRow key={pay.id}>
                <TableCell>{pay.payment_date || '-'}</TableCell>
                <TableCell className="font-semibold">{pay.invoices?.invoice_number || '-'}</TableCell>
                <TableCell>{pay.payment_method || '-'}</TableCell>
                <TableCell>{pay.reference_number || '-'}</TableCell>
                <TableCell className="font-medium text-green-600">{formatIDR(pay.amount)}</TableCell>
                <TableCell className="text-right space-x-2">
                  <Button variant="outline" size="sm">View Proof</Button>
                </TableCell>
              </TableRow>
            ))}
            {(!payments || payments.length === 0) && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-6 text-gray-500">
                  Belum ada riwayat pembayaran.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}