'use client'

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, Legend } from 'recharts'

// Warna dengan kontras yang lebih tajam dan jelas
const COLORS = ['#2563eb', '#d97706', '#059669', '#dc2626']

export default function DashboardCharts({ 
  companyChartData, 
  paymentStatusData, 
  prPoComparisonData 
}: { 
  companyChartData: any[]
  paymentStatusData: any[]
  prPoComparisonData: any[]
}) {
  const formatRupiah = (val: number) => {
    if (val >= 1000000000) return `Rp ${(val / 1000000000).toFixed(1)} M`
    if (val >= 1000000) return `Rp ${(val / 1000000).toFixed(1)} jt`
    if (val >= 1000) return `Rp ${(val / 1000).toFixed(0)} rb`
    return `Rp ${val}`
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {/* Outstanding per Company */}
      <div className="bg-card text-card-foreground rounded-xl border p-4 shadow-sm">
        <h3 className="text-sm font-semibold mb-4 text-foreground">Outstanding per Company</h3>
        <div className="h-[240px] w-full">
          {companyChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={companyChartData} margin={{ top: 10, right: 10, left: 10, bottom: 25 }}>
                <XAxis 
                  dataKey="name" 
                  fontSize={11} 
                  tickLine={false} 
                  axisLine={false} 
                  interval={0} 
                  angle={0} 
                  textAnchor="middle" 
                  stroke="currentColor" 
                  className="text-muted-foreground" 
                />
                <YAxis fontSize={11} tickLine={false} axisLine={false} tickFormatter={formatRupiah} width={70} stroke="currentColor" className="text-muted-foreground" />
                <Tooltip 
                  formatter={(val: any) => [`Rp ${Number(val).toLocaleString('id-ID')}`, 'Outstanding']}
                  contentStyle={{ backgroundColor: '#0f172a', color: '#f8fafc', borderColor: '#334155', borderRadius: '8px', fontSize: '12px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.2)' }}
                  itemStyle={{ color: '#f8fafc' }}
                  labelStyle={{ color: '#94a3b8', fontWeight: 'bold', marginBottom: '4px' }}
                />
                <Bar dataKey="outstanding" fill="#2563eb" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
              Belum ada data outstanding.
            </div>
          )}
        </div>
      </div>

      {/* Payment Status Breakdown */}
      <div className="bg-card text-card-foreground rounded-xl border p-4 shadow-sm">
        <h3 className="text-sm font-semibold mb-4 text-foreground">Payment Status Breakdown</h3>
        <div className="h-[240px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={paymentStatusData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={65}
                innerRadius={32}
                paddingAngle={4}
              >
                {paymentStatusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="#ffffff" strokeWidth={1} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(val: any, name: any) => [val, name]}
                contentStyle={{ backgroundColor: '#0f172a', color: '#f8fafc', borderColor: '#334155', borderRadius: '8px', fontSize: '12px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.2)' }}
                itemStyle={{ color: '#f8fafc' }}
                labelStyle={{ color: '#94a3b8', fontWeight: 'bold' }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '4px', color: 'currentColor' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* PR vs PO Comparison */}
      <div className="bg-card text-card-foreground rounded-xl border p-4 shadow-sm col-span-full lg:col-span-1">
        <h3 className="text-sm font-semibold mb-4 text-foreground">PR vs PO Released Comparison</h3>
        <div className="h-[240px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={prPoComparisonData} margin={{ top: 10, right: 10, left: 10, bottom: 25 }}>
              <XAxis dataKey="category" fontSize={11} tickLine={false} axisLine={false} stroke="currentColor" className="text-muted-foreground" />
              <YAxis fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} width={30} stroke="currentColor" className="text-muted-foreground" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0f172a', color: '#f8fafc', borderColor: '#334155', borderRadius: '8px', fontSize: '12px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.2)' }}
                itemStyle={{ color: '#f8fafc' }}
                labelStyle={{ color: '#94a3b8', fontWeight: 'bold', marginBottom: '4px' }}
              />
              <Bar dataKey="count" fill="#059669" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}