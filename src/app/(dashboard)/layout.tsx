'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  LayoutDashboard, 
  FolderKanban, 
  Database, 
  FileText, 
  ShoppingCart, 
  Receipt, 
  CreditCard,
  ChevronDown,
  ChevronRight,
  Building2,
  Users,
  User
} from 'lucide-react'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  // State untuk mengontrol buka/tutup dropdown Master Data
  const [isMasterOpen, setIsMasterOpen] = useState(
    pathname?.startsWith('/master') || 
    pathname?.startsWith('/companies') || 
    pathname?.startsWith('/vendors') ||
    pathname?.startsWith('/customers')
  )

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar Navigasi */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col h-full shrink-0">
        <div className="p-6 border-b border-slate-100">
          <h1 className="text-base font-bold text-slate-800 tracking-wider">PROCUREMENT APP</h1>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto text-sm">
          
          {/* Dashboard */}
          <Link
            href="/dashboard"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors ${
              pathname === '/dashboard' ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <LayoutDashboard className="w-5 h-5 shrink-0" />
            <span>Dashboard</span>
          </Link>

          {/* Projects (Tepat di bawah Dashboard) */}
          <Link
            href="/projects"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors ${
              pathname === '/projects' || pathname?.startsWith('/projects/') ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <FolderKanban className="w-5 h-5 shrink-0" />
            <span>Projects</span>
          </Link>

          {/* Master Data Dropdown */}
          <div>
            <button
              onClick={() => setIsMasterOpen(!isMasterOpen)}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Database className="w-5 h-5 shrink-0" />
                <span>Master Data</span>
              </div>
              {isMasterOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>

            {/* Sub-menu Master Data */}
            {isMasterOpen && (
              <div className="pl-9 pr-2 py-1 space-y-1">
                <Link
                  href="/customers"
                  className={`flex items-center gap-2 px-3 py-2 rounded-md font-medium text-xs transition-colors ${
                    pathname === '/customers' ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <User className="w-4 h-4 shrink-0" />
                  <span>Customers</span>
                </Link>
                <Link
                  href="/companies"
                  className={`flex items-center gap-2 px-3 py-2 rounded-md font-medium text-xs transition-colors ${
                    pathname === '/companies' ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <Building2 className="w-4 h-4 shrink-0" />
                  <span>Companies</span>
                </Link>
                <Link
                  href="/vendors"
                  className={`flex items-center gap-2 px-3 py-2 rounded-md font-medium text-xs transition-colors ${
                    pathname === '/vendors' ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <Users className="w-4 h-4 shrink-0" />
                  <span>Vendors</span>
                </Link>
              </div>
            )}
          </div>

          <hr className="my-2 border-slate-100" />

          {/* Purchase Requests */}
          <Link
            href="/pr"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors ${
              pathname === '/pr' || pathname?.startsWith('/pr/') ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <FileText className="w-5 h-5 shrink-0" />
            <span>Purchase Requests</span>
          </Link>

          {/* Purchase Orders */}
          <Link
            href="/po"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors ${
              pathname === '/po' || pathname?.startsWith('/po/') ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <ShoppingCart className="w-5 h-5 shrink-0" />
            <span>Purchase Orders</span>
          </Link>

          {/* Invoices */}
          <Link
            href="/invoices"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors ${
              pathname === '/invoices' || pathname?.startsWith('/invoices/') ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <Receipt className="w-5 h-5 shrink-0" />
            <span>Invoices</span>
          </Link>

          {/* Payments */}
          <Link
            href="/payments"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors ${
              pathname === '/payments' || pathname?.startsWith('/payments/') ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <CreditCard className="w-5 h-5 shrink-0" />
            <span>Payments</span>
          </Link>

        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}