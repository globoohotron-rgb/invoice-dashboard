import React from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

const links = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/invoices', label: 'Invoices' },
]

interface SidebarProps {
  open?: boolean
  onClose?: () => void
}

export default function Sidebar({ open = true, onClose }: SidebarProps) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <>
      {/* Overlay — mobile only, shown when drawer is open */}
      {onClose && open && (
        <div
          className="fixed inset-0 z-20 bg-black/40 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`
          fixed inset-y-0 left-0 z-30
          flex h-full w-56 flex-shrink-0 flex-col
          border-r border-gray-200 bg-white px-4 py-6
          transition-transform duration-200
          md:static md:z-auto md:translate-x-0 md:flex
          ${open ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="mb-8">
          <span className="text-lg font-bold text-blue-600">InvoicePro</span>
        </div>
        <nav className="flex-1 space-y-1">
          {links.map(l => (
            <NavLink
              key={l.to}
              to={l.to}
              onClick={onClose}
              className={({ isActive }) =>
                `block rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'
                }`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-gray-200 pt-4">
          <p className="truncate text-xs font-medium text-gray-700">{user?.name}</p>
          <p className="truncate text-xs text-gray-400">{user?.email}</p>
          <button
            onClick={handleLogout}
            className="mt-3 w-full rounded-md px-3 py-2 text-left text-sm text-gray-600 hover:bg-gray-50"
          >
            Sign out
          </button>
        </div>
      </aside>
    </>
  )
}

