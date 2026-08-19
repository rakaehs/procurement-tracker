import { createClient } from '@/lib/supabase/server'
import { Card, CardTitle } from '@/components/ui/card'
import { 
  FileText, TrendingUp, AlertCircle, CheckCircle2, Clock, Layers, FileCheck 
} from 'lucide-react'
import DashboardCharts from '@/components/dashboard-charts'
import TrackingTable, { TrackingRow } from '@/components/tracking-table'

interface SearchParams {
  company?: string
  project?: string
  vendor?: string
  status_pr?: string
  payment_status?: string
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  const supabase = await createClient()

  // 1. Ambil seluruh data master & transaksi secara independen
  const [
    { data: companies },
    { data: projects },
    { data: vendors },
    { data: prData },
    { data: poData },
    { data: invoiceData },
    { data: paymentData }
  ] = await Promise.all([
    supabase.from('companies').select('*'),
    supabase.from('projects').select('*'),
    supabase.from('vendors').select('*'),
    supabase.from('purchase_requests').select('*'),
    supabase.from('purchase_orders').select('*'),
    supabase.from('invoices').select('*'),
    supabase.from('payments').select('*'),
  ])

  // Helper untuk mendapatkan Signed URL (Mendukung RLS & Akurasi Bucket)
  const getFileUrl = async (path: string | null, defaultBucket: string = 'po_documents') => {
    if (!path) return null
    if (path.startsWith('http://') || path.startsWith('https://')) return path
    
    let cleanPath = path.startsWith('/') ? path.substring(1) : path
    let targetBucket = defaultBucket

    const knownBuckets = ['invoice_documents', 'payment_documents', 'po_documents', 'documents', 'public']

    for (const bucket of knownBuckets) {
      if (cleanPath.toLowerCase().startsWith(bucket.toLowerCase() + '/')) {
        targetBucket = bucket
        cleanPath = cleanPath.substring(bucket.length + 1)
        break
      }
    }

    const { data, error } = await supabase.storage
      .from(targetBucket)
      .createSignedUrl(cleanPath, 3600)

    if (error || !data?.signedUrl) {
      const { data: pubData } = supabase.storage.from(targetBucket).getPublicUrl(cleanPath)
      return pubData?.publicUrl || null
    }

    return data.signedUrl
  }

  // 2. Mapping Master Data
  const companyMap = new Map(companies?.map(c => [c.id, c.company_name || c.name]) || [])
  const projectMap = new Map(projects?.map(p => [p.id, p.project_name || p.name]) || [])
  const vendorMap = new Map(vendors?.map(v => [v.id, v.vendor_name || v.name]) || [])
  
  const paymentsByInvoice = new Map<string, any[]>()
  paymentData?.forEach((p: any) => {
    const invId = p.invoice_id || p.inv_id || p.invoiceId
    if (invId) {
      const list = paymentsByInvoice.get(invId) || []
      list.push(p)
      paymentsByInvoice.set(invId, list)
    }
  })

  const invoicesByPo = new Map<string, any[]>()
  invoiceData?.forEach((inv: any) => {
    const poId = inv.po_id || inv.purchase_order_id || inv.order_id || inv.poId
    if (poId) {
      const list = invoicesByPo.get(poId) || []
      list.push(inv)
      invoicesByPo.set(poId, list)
    }
  })

  // Filter hanya PO yang berstatus "released"
  const releasedPOs = poData?.filter((po: any) => {
    const status = (po.status || po.status_po || '').toLowerCase()
    return !status || status === 'released' || status === 'release'
  }) || []

  const poByPrId = new Set<string>()
  releasedPOs.forEach((po: any) => {
    const prId = po.pr_id || po.purchase_request_id || po.prId
    if (prId) poByPrId.add(prId)
  })

  // 3. Kalkulasi Sub-KPI Statis
  let countWaitingPayment = 0
  let countPartialPaid = 0
  let countPaid = 0
  let countOverdue = 0
  let countPrSubmittedNoPo = 0

  prData?.forEach((pr: any) => {
    const prStatus = pr.status || pr.status_pr
    if (prStatus === 'Submitted' && !poByPrId.has(pr.id)) {
      countPrSubmittedNoPo++
    }
  })

  const companyOutstandingMap: { [key: string]: number } = {}
  const vendorOutstandingMap: { [key: string]: number } = {}
  const projectOutstandingMap: { [key: string]: number } = {}

  // 4. Proses Tracking Rows & Metrik Dinamis Berdasarkan Filter Utama
  let uniqueMatchedPoIds = new Set<string>()
  let filteredPoNilai = 0
  let filteredInvoiceCount = 0
  let filteredInvoiceNilai = 0
  let filteredPaidAmount = 0
  let filteredOutstandingAmount = 0
  let uniqueInvoicesSet = new Set<string>()

  const trackingRowsPromises = releasedPOs.flatMap((po: any) => {
    const prId = po.pr_id || po.purchase_request_id || po.prId
    const pr = prId ? prData?.find(item => item.id === prId) : null

    const compId = pr?.company_id || po.company_id
    const projId = pr?.project_id || po.project_id
    const compName = compId ? companyMap.get(compId) || '-' : '-'
    const projName = projId ? projectMap.get(projId) || '-' : '-'

    const vendorId = po.vendor_id || po.vendors_id || po.vendorId
    const vendorName = vendorId ? vendorMap.get(vendorId) || '-' : '-'

    const currentStatusPr = pr?.status || pr?.status_pr || 'Not Submitted'
    const currentStatusPo = po.status || po.status_po || 'Released'

    if (params.company && compId !== params.company) return []
    if (params.project && projId !== params.project) return []
    if (params.vendor && vendorId !== params.vendor) return []
    if (params.status_pr && currentStatusPr !== params.status_pr) return []

    const poNilai = Number(po.total_amount ?? po.amount ?? po.total ?? 0)
    const invoices = invoicesByPo.get(po.id) || []

    if (invoices.length === 0) {
      const noPr = pr?.pr_number || pr?.pr_no || '-'
      const noPo = po.po_number || po.po_no || '-'

      if (params.payment_status) return []

      if (!uniqueMatchedPoIds.has(po.id)) {
        uniqueMatchedPoIds.add(po.id)
        filteredPoNilai += poNilai
      }

      return [
        (async (): Promise<TrackingRow> => {
          const rawPoFile = po.document_url || po.po_document_url || po.file_url || null
          const filePoUrl = await getFileUrl(rawPoFile, 'po_documents')
          return {
            company: compName,
            project: projName,
            no_pr: noPr,
            status_pr: currentStatusPr,
            no_po: noPo,
            status_po: currentStatusPo,
            tanggal_po: po.po_date || po.date || '-',
            vendor: vendorName,
            nilai_po: poNilai,
            file_po: filePoUrl,
            no_invoice: '-',
            status_inv: '-',
            tanggal_invoice: '-',
            nilai_invoice: 0,
            file_invoice: null,
            total_paid: 0,
            payment_status: '-',
            tanggal_bayar: '-',
            metode_bayar: '-',
            file_payment: null,
            outstanding: 0
          }
        })()
      ]
    } else {
      return invoices.map((inv: any) => {
        return (async (): Promise<TrackingRow | null> => {
          const invNilai = Number(inv.total_amount ?? inv.amount ?? inv.total ?? 0)

          const payments = paymentsByInvoice.get(inv.id) || []
          let paidForThisInvoice = 0
          let lastPaymentDate = '-'
          let paymentMethodsSet = new Set<string>()

          payments.forEach((p: any) => {
            paidForThisInvoice += Number(p.amount ?? p.total ?? p.paid_amount ?? 0)
            const pDate = p.payment_date || p.date || p.tanggal
            if (pDate) lastPaymentDate = pDate
            const pMethod = p.payment_method || p.method || p.metode_pembayaran
            if (pMethod) paymentMethodsSet.add(pMethod)
          })

          const outstanding = Math.max(0, invNilai - paidForThisInvoice)

          if (outstanding > 0) {
            if (compName !== '-') companyOutstandingMap[compName] = (companyOutstandingMap[compName] || 0) + outstanding
            if (vendorName !== '-') vendorOutstandingMap[vendorName] = (vendorOutstandingMap[vendorName] || 0) + outstanding
            if (projName !== '-') projectOutstandingMap[projName] = (projectOutstandingMap[projName] || 0) + outstanding
          }

          const dueDate = inv.due_date || inv.tanggal_jatuh_tempo
          const isOverdue = dueDate && new Date(dueDate) < new Date() && paidForThisInvoice < invNilai

          let pStatus = 'Waiting Payment'
          if (paidForThisInvoice >= invNilai && invNilai > 0) {
            pStatus = 'Paid'
            countPaid++
          } else if (isOverdue) {
            pStatus = 'Overdue'
            countOverdue++
          } else if (paidForThisInvoice > 0 && paidForThisInvoice < invNilai) {
            pStatus = 'Partial Paid'
            countPartialPaid++
          } else {
            pStatus = 'Waiting Payment'
            countWaitingPayment++
          }

          if (params.payment_status) {
            if (params.payment_status === 'Waiting Payment') {
              if (pStatus !== 'Waiting Payment' && pStatus !== 'Partial Paid') return null
            } else if (params.payment_status === 'Partial Paid') {
              if (pStatus !== 'Partial Paid') return null
            } else if (params.payment_status === 'Paid') {
              if (pStatus !== 'Paid') return null
            } else if (params.payment_status === 'Overdue') {
              if (pStatus !== 'Overdue') return null
            }
          }

          const noPr = pr?.pr_number || pr?.pr_no || '-'
          const noPo = po.po_number || po.po_no || '-'
          const noInv = inv.invoice_number || inv.invoice_no || inv.no_invoice || '-'
          const statusInv = inv.status || 'Invoice Received'
          const tglInv = inv.invoice_date || inv.date || inv.tanggal || '-'
          const metodeBayarStr = paymentMethodsSet.size > 0 ? Array.from(paymentMethodsSet).join(', ') : '-'

          if (!uniqueMatchedPoIds.has(po.id)) {
            uniqueMatchedPoIds.add(po.id)
            filteredPoNilai += poNilai
          }

          if (!uniqueInvoicesSet.has(inv.id)) {
            uniqueInvoicesSet.add(inv.id)
            filteredInvoiceCount++
            filteredInvoiceNilai += invNilai
          }

          filteredPaidAmount += paidForThisInvoice
          filteredOutstandingAmount += outstanding

          const rawPoFile = po.document_url || po.po_document_url || po.file_url || null
          const rawInvFile = inv.inv_document_url || inv.document_url || inv.invoice_document_url || inv.file_url || null
          const rawPayFile = payments.length > 0 ? (payments[0].payment_document_url || payments[0].document_url || payments[0].proof_url || payments[0].file_url || null) : null

          const filePoUrl = await getFileUrl(rawPoFile, 'po_documents')
          const fileInvUrl = await getFileUrl(rawInvFile, 'invoice_documents')
          const paymentProof = await getFileUrl(rawPayFile, 'payment_documents')

          return {
            company: compName,
            project: projName,
            no_pr: noPr,
            status_pr: currentStatusPr,
            no_po: noPo,
            status_po: currentStatusPo,
            tanggal_po: po.po_date || po.date || '-',
            vendor: vendorName,
            nilai_po: poNilai,
            file_po: filePoUrl,
            no_invoice: noInv,
            status_inv: statusInv,
            tanggal_invoice: tglInv,
            nilai_invoice: invNilai,
            file_invoice: fileInvUrl,
            total_paid: paidForThisInvoice,
            payment_status: pStatus,
            tanggal_bayar: lastPaymentDate,
            metode_bayar: metodeBayarStr,
            file_payment: paymentProof,
            outstanding: outstanding
          }
        })()
      })
    }
  })

  const trackingRows = (await Promise.all(trackingRowsPromises)).filter(Boolean) as TrackingRow[]

  const paymentStatusData = [
    { name: 'Waiting', value: countWaitingPayment },
    { name: 'Partial', value: countPartialPaid },
    { name: 'Paid', value: countPaid },
    { name: 'Overdue', value: countOverdue },
  ]

  const companyChartData = Object.keys(companyOutstandingMap).map(key => ({
    name: key,
    outstanding: companyOutstandingMap[key]
  }))

  const prPoComparisonData = [
    { category: 'Total PR', count: prData?.length || 0 },
    { category: 'PO Released', count: releasedPOs.length },
  ]

  return (
    <div className="space-y-6 p-6">
      {/* Header Utama */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Procurement & Payment Dashboard</h1>
        <p className="text-muted-foreground">Monitoring siklus pengadaan (PO Released), status tagihan, dokumen, dan pembayaran.</p>
      </div>

      {/* Filter Bar (Master Dropdown Filter - DIPINDAHKAN KE PALING ATAS) */}
      <Card className="p-4">
        <form method="GET" className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <select name="company" defaultValue={params.company || ''} className="border rounded px-2 py-1.5 text-sm bg-background">
            <option value="">Semua Company</option>
            {companies?.map(c => <option key={c.id} value={c.id}>{c.company_name || c.name}</option>)}
          </select>

          <select name="project" defaultValue={params.project || ''} className="border rounded px-2 py-1.5 text-sm bg-background">
            <option value="">Semua Project</option>
            {projects?.map(p => <option key={p.id} value={p.id}>{p.project_name || p.name}</option>)}
          </select>

          <select name="vendor" defaultValue={params.vendor || ''} className="border rounded px-2 py-1.5 text-sm bg-background">
            <option value="">Semua Vendor</option>
            {vendors?.map(v => <option key={v.id} value={v.id}>{v.vendor_name || v.name}</option>)}
          </select>

          <select name="payment_status" defaultValue={params.payment_status || ''} className="border rounded px-2 py-1.5 text-sm bg-background">
            <option value="">Semua Payment Status</option>
            <option value="Waiting Payment">Waiting Payment</option>
            <option value="Partial Paid">Partial Paid</option>
            <option value="Paid">Paid</option>
            <option value="Overdue">Overdue</option>
          </select>

          <div className="flex gap-2 col-span-full">
            <button type="submit" className="flex-1 bg-primary text-primary-foreground rounded text-sm font-medium py-1.5">Terapkan Filter</button>
            <a href="/dashboard" className="px-4 py-1.5 border rounded text-sm text-center flex items-center justify-center text-muted-foreground">Reset</a>
          </div>
        </form>
      </Card>

      {/* KPI Cards Utama */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="flex flex-col items-center justify-center text-center p-4">
          <FileText className="h-5 w-5 text-muted-foreground mb-1" />
          <CardTitle className="text-sm font-medium">Total PO (Released)</CardTitle>
          <div className="text-2xl font-bold mt-1">{uniqueMatchedPoIds.size} PO</div>
          <p className="text-sm font-semibold text-muted-foreground mt-1">Nilai PO Released: Rp {filteredPoNilai.toLocaleString('id-ID')}</p>
        </Card>

        <Card className="flex flex-col items-center justify-center text-center p-4">
          <TrendingUp className="h-5 w-5 text-muted-foreground mb-1" />
          <CardTitle className="text-sm font-medium">Total Invoice</CardTitle>
          <div className="text-2xl font-bold mt-1">{filteredInvoiceCount} Invoice</div>
          <p className="text-sm font-semibold text-muted-foreground mt-1">Nilai: Rp {filteredInvoiceNilai.toLocaleString('id-ID')}</p>
        </Card>

        <Card className="flex flex-col items-center justify-center text-center p-4">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 mb-1" />
          <CardTitle className="text-sm font-medium">Total Paid</CardTitle>
          <div className="text-2xl font-bold text-emerald-600 mt-1">Rp {filteredPaidAmount.toLocaleString('id-ID')}</div>
          <p className="text-xs text-muted-foreground mt-0.5">Pembayaran terealisasi</p>
        </Card>

        <Card className="flex flex-col items-center justify-center text-center p-4">
          <AlertCircle className="h-5 w-5 text-amber-600 mb-1" />
          <CardTitle className="text-sm font-medium">Total Outstanding</CardTitle>
          <div className="text-2xl font-bold text-amber-600 mt-1">Rp {filteredOutstandingAmount.toLocaleString('id-ID')}</div>
          <p className="text-xs text-muted-foreground mt-0.5">Sisa tagihan belum lunas</p>
        </Card>
      </div>

      {/* Sub KPI */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
        <Card className="p-4 flex flex-col items-center justify-center text-center min-h-[110px]">
          <p className="text-xs text-muted-foreground">PR Tanpa PO</p>
          <p className="text-lg font-bold text-indigo-600 my-1">{countPrSubmittedNoPo}</p>
          <FileCheck className="h-5 w-5 text-indigo-500" />
        </Card>

        <Card className="p-4 flex flex-col items-center justify-center text-center min-h-[110px]">
          <p className="text-xs text-muted-foreground">Menunggu Pembayaran</p>
          <p className="text-lg font-bold my-1">{countWaitingPayment}</p>
          <Clock className="h-5 w-5 text-blue-500" />
        </Card>

        <Card className="p-4 flex flex-col items-center justify-center text-center min-h-[110px]">
          <p className="text-xs text-muted-foreground">Partial Paid</p>
          <p className="text-lg font-bold my-1">{countPartialPaid}</p>
          <Layers className="h-5 w-5 text-amber-500" />
        </Card>

        <Card className="p-4 flex flex-col items-center justify-center text-center min-h-[110px]">
          <p className="text-xs text-muted-foreground">Paid</p>
          <p className="text-lg font-bold my-1">{countPaid}</p>
          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
        </Card>

        <Card className="p-4 flex flex-col items-center justify-center text-center min-h-[110px] col-span-2 lg:col-span-1">
          <p className="text-xs text-muted-foreground">Overdue</p>
          <p className="text-lg font-bold text-red-600 my-1">{countOverdue}</p>
          <AlertCircle className="h-5 w-5 text-red-500" />
        </Card>
      </div>

      {/* Charts */}
      <DashboardCharts 
        companyChartData={companyChartData}
        paymentStatusData={paymentStatusData}
        prPoComparisonData={prPoComparisonData}
      />

      {/* Client Component Tabel Tracking */}
      <TrackingTable initialRows={trackingRows} />
    </div>
  )
}