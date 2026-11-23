import { lazy, Suspense, useEffect, useState } from 'react'
import { ChartNoAxesColumnIncreasing } from 'lucide-react'
import WelcomeBanner from '../components/WelcomeBanner.jsx'
import CalendarPreview from '../components/dashboard/CalendarPreview.jsx'
import FinancialInsights from '../components/dashboard/FinancialInsights.jsx'
import MonthlyBudget from '../components/dashboard/MonthlyBudget.jsx'
import QuickActions from '../components/dashboard/QuickActions.jsx'
import RecentTransactions from '../components/dashboard/RecentTransactions.jsx'
import SavingsGoals from '../components/dashboard/SavingsGoals.jsx'
import SummaryCards from '../components/dashboard/SummaryCards.jsx'
import WidgetCard, { WidgetState } from '../components/dashboard/WidgetCard.jsx'
import './DashboardPage.css'
import { useRealtimeRefresh } from '../hooks/useRealtimeRefresh.js'
import { useAuth } from '../context/useAuth.js'
import { getDashboardData } from '../data/dashboardRepository.js'
import { summaryCards, spendingByRange, monthlyBudget, savingsGoals, transactions } from '../data/dashboardData.js'

const SpendingOverview = lazy(
  () => import('../components/dashboard/SpendingOverview.jsx'),
)

function SpendingOverviewFallback() {
  return (
    <WidgetCard
      className="spending-widget"
      icon={ChartNoAxesColumnIncreasing}
      title="Spending Overview"
    >
      <WidgetState loading />
    </WidgetCard>
  )
}

function DashboardPage() {
  const { user, isDemoMode } = useAuth()
  const [dashboard, setDashboard] = useState({
    summaryCards,
    spendingByRange,
    monthlyBudget,
    savingsGoals,
    transactions,
  })
  const [loading, setLoading] = useState(!isDemoMode)
  const [error, setError] = useState('')
  const [dashboardRefreshKey, setDashboardRefreshKey] = useState(0)

  useRealtimeRefresh(
    user?.id,
    ['transactions', 'financial_accounts', 'financial_connections', 'savings_goals', 'budgets'],
    () => setDashboardRefreshKey((key) => key + 1),
  )

  useEffect(() => {
    const controller = new AbortController()
    let active = true
    async function load() {
      setLoading(true)
      setError('')
      try {
        const data = await getDashboardData(user?.id, controller.signal)
        if (active) setDashboard(data)
      } catch (loadError) {
        if (!active || controller.signal.aborted) return
        console.error('Unable to load dashboard data.', loadError)
        setError('Your dashboard could not be refreshed. Please try again.')
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => {
      active = false
      controller.abort()
    }
  }, [dashboardRefreshKey, isDemoMode, user?.id])

  return (
    <div className="dashboard-page">
      <WelcomeBanner />
      <QuickActions />
      {error && <p className="dashboard-load-error" role="alert">{error}</p>}
      <SummaryCards cards={dashboard.summaryCards} />
      <div className="dashboard-widgets">
        <Suspense fallback={<SpendingOverviewFallback />}>
          <SpendingOverview loading={loading} spendingData={dashboard.spendingByRange} />
        </Suspense>
        <SavingsGoals loading={loading} goals={dashboard.savingsGoals} />
        <MonthlyBudget budget={dashboard.monthlyBudget} />
        <RecentTransactions loading={loading} transactions={dashboard.transactions} />
        <FinancialInsights />
        <CalendarPreview />
      </div>
    </div>
  )
}

export default DashboardPage
