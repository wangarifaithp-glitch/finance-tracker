import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import './App.css'
import AppLayout from './components/AppLayout.jsx'
import { useAuth } from './context/useAuth.js'
import AuthPage from './pages/AuthPage.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import SectionPage from './pages/SectionPage.jsx'
import SavingsGoalsPage from './pages/SavingsGoalsPage.jsx'
import SettingsPage from './pages/SettingsPage.jsx'
import NotificationsPage from './pages/NotificationsPage.jsx'
import BudgetsPage from './pages/BudgetsPage.jsx'
import FinancialConnectionsPage from './pages/FinancialConnectionsPage.jsx'
import TransactionsPage from './pages/TransactionsPage.jsx'

const ReportsPage = lazy(() => import('./pages/ReportsPage.jsx'))
const MoneyJournalPage = lazy(() => import('./pages/MoneyJournalPage.jsx'))
const FinancialCalendarPage = lazy(() => import('./pages/FinancialCalendarPage.jsx'))
const AccountsPage = lazy(() => import('./pages/AccountsPage.jsx'))

const sections = [
]

function ProtectedAppLayout() {
  const { isDemoMode, isLoading, isSupabaseConfigured, user } = useAuth()

  if (isLoading) {
    return (
      <main className="app-loading" role="status">
        Restoring your secure session...
      </main>
    )
  }
  if (!isDemoMode && (!isSupabaseConfigured || !user)) {
    return <Navigate to="/login" replace />
  }

  return <AppLayout />
}

function App() {
  return (
    <Routes>
      <Route path="login" element={<AuthPage />} />
      <Route path="reset-password" element={<AuthPage />} />
      <Route element={<ProtectedAppLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="transactions" element={<TransactionsPage />} />
        <Route
          path="accounts"
          element={
            <Suspense fallback={<main className="app-loading" role="status">Opening your accounts...</main>}>
              <AccountsPage />
            </Suspense>
          }
        />
        <Route path="savings-goals" element={<SavingsGoalsPage />} />
        <Route
          path="journal"
          element={
            <Suspense fallback={<main className="app-loading" role="status">Opening your journal...</main>}>
              <MoneyJournalPage />
            </Suspense>
          }
        />
        <Route
          path="calendar"
          element={
            <Suspense fallback={<main className="app-loading" role="status">Opening your financial calendar...</main>}>
              <FinancialCalendarPage />
            </Suspense>
          }
        />
        <Route
          path="reports"
          element={
            <Suspense fallback={<main className="app-loading" role="status">Preparing your reports...</main>}>
              <ReportsPage />
            </Suspense>
          }
        />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="budgets" element={<BudgetsPage />} />
        <Route path="connections" element={<FinancialConnectionsPage />} />
        {sections.map((section) => (
          <Route
            key={section.path}
            path={section.path}
            element={
              <SectionPage
                title={section.title}
                description={section.description}
              />
            }
          />
        ))}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export default App
