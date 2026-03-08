import api from './client'
import { DashboardSummary, RevenueDataPoint, RevenuePeriod } from '../types'

export const dashboardApi = {
  getSummary: () =>
    api.get<DashboardSummary>('/dashboard/summary'),

  getRevenue: (period: RevenuePeriod) =>
    api.get<RevenueDataPoint[]>('/dashboard/revenue', { params: { period } }),
}
