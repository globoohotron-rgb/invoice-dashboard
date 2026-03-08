import React, { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Mobile top bar */}
      <div className="fixed top-0 left-0 right-0 z-10 flex h-12 items-center border-b border-gray-200 bg-white px-4 md:hidden">
        <button
          onClick={() => setSidebarOpen(true)}
          className="text-xl text-gray-600 hover:text-gray-900"
          aria-label="Open menu"
        >
          ☰
        </button>
        <span className="ml-3 text-sm font-bold text-blue-600">InvoicePro</span>
      </div>

      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="flex-1 overflow-y-auto p-4 pt-16 md:p-8 md:pt-8">
        <Outlet />
      </main>
    </div>
  )
}

