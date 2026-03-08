import React, { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { dashboardApi } from '../../api/dashboard'
import { RevenuePeriod } from '../../types'
import SummaryCards from '../../components/dashboard/SummaryCards'
import RevenueChart from '../../components/dashboard/RevenueChart'
import RecentInvoices from '../../components/dashboard/RecentInvoices'

export default function DashboardPage() {
  const [period, setPeriod] = useState<RevenuePeriod>('month')

  useEffect(() => { document.title = 'Dashboard | InvoiceApp' }, [])

  const { data: summary, isLoading: loadingSummary } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: () => dashboardApi.getSummary().then(r => r.data),
  })

  const { data: revenue = [], isLoading: loadingRevenue } = useQuery({
    queryKey: ['dashboard-revenue', period],
    queryFn: () => dashboardApi.getRevenue(period).then(r => r.data),
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      <SummaryCards data={summary} loading={loadingSummary} />

      <RevenueChart
        data={revenue}
        period={period}
        loading={loadingRevenue}
        onPeriodChange={setPeriod}
      />

      <RecentInvoices />
    </div>
  )
}
