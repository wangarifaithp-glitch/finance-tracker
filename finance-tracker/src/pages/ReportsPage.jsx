import { useEffect, useMemo, useState } from 'react'
import {
  differenceInCalendarDays,
  endOfMonth,
  format,
  parseISO,
  startOfMonth,
  startOfWeek,
  startOfYear,
  subMonths,
} from 'date-fns'
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Download,
  Lightbulb,
  PiggyBank,
  Scale,
  Target,
  TrendingDown,
  TrendingUp,
} from 'lucide-react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useAuth } from '../context/useAuth.js'
import { useCurrency } from '../context/useCurrency.js'
import { getFinancialReport } from '../data/financialReportRepository.js'
import { TODAY } from '../data/transactionData.js'
import './ReportsPage.css'
import { useRealtimeRefresh } from '../hooks/useRealtimeRefresh.js'

const chartColors = ['#8b5cf6', '#f27c9d', '#eea934', '#35a984', '#55a9ed', '#a780c7']
const zeroTotals = {
  income: 0,
  expenses: 0,
  transfers: 0,
  net: 0,
  transactionCount: 0,
}

function getRange(period, customFrom, customTo) {
  const today = TODAY
  let from
  let to = today

  if (period === 'this_week') {
    from = startOfWeek(today, { weekStartsOn: 1 })
  } else if (period === 'this_month') {
    from = startOfMonth(today)
  } else if (period === 'last_month') {
    const lastMonth = subMonths(today, 1)
    from = startOfMonth(lastMonth)
    to = endOfMonth(lastMonth)
  } else if (period === 'this_year') {
    from = startOfYear(today)
  } else {
    from = customFrom ? parseISO(customFrom) : null
    to = customTo ? parseISO(customTo) : null
  }

  const fromValue = from ? format(from, 'yyyy-MM-dd') : ''
  const toValue = to ? format(to, 'yyyy-MM-dd') : ''
  return {
    from: fromValue,
    to: toValue,
    isValid: Boolean(fromValue && toValue && fromValue <= toValue),
  }
}

function formatPeriod(value, groupBy) {
  return format(parseISO(value), groupBy === 'month' ? 'MMM yy' : 'd MMM')
}

function buildInsights(report) {
  if (!report || report.totals.transactionCount === 0) return []

  const insights = []
  const { totals, previousTotals, categories, largestExpenses, savings } = report
  if (previousTotals.expenses > 0) {
    const change = Math.round(
      ((totals.expenses - previousTotals.expenses) / previousTotals.expenses) * 100,
    )
    if (change > 0) {
      insights.push({
        icon: TrendingUp,
        tone: 'insight-warm',
        text: `Your expenses increased by ${change}% compared with the previous period.`,
      })
    } else if (change < 0) {
      insights.push({
        icon: TrendingDown,
        tone: 'insight-positive',
        text: `Your expenses decreased by ${Math.abs(change)}% compared with the previous period.`,
      })
    }
  }
  if (categories[0]) {
    insights.push({
      icon: Activity,
      tone: 'insight-purple',
      text: `You spent the most on ${categories[0].category} this period.`,
    })
  }
  if (totals.net > 0) {
    insights.push({
      icon: ArrowUpRight,
      tone: 'insight-positive',
      text: 'You had positive cash flow: income was higher than expenses.',
    })
  } else if (totals.net < 0) {
    insights.push({
      icon: ArrowDownRight,
      tone: 'insight-warm',
      text: 'Expenses were higher than income during this period.',
    })
  }
  const netSavings = savings.contributedInPeriod - savings.withdrawnInPeriod
  if (netSavings > 0) {
    insights.push({
      icon: PiggyBank,
      tone: 'insight-positive',
      text: 'Your savings goals received more contributions than withdrawals.',
    })
  } else if (netSavings < 0) {
    insights.push({
      icon: PiggyBank,
      tone: 'insight-warm',
      text: 'Withdrawals from savings goals were higher than contributions.',
    })
  }
  if (largestExpenses[0]) {
    insights.push({
      icon: Scale,
      tone: 'insight-purple',
      text: `Your largest expense was ${largestExpenses[0].title}.`,
    })
  }
  return insights.slice(0, 5)
}

function ReportTooltip({ active, payload, label, formatAmount, groupBy }) {
  if (!active || !payload?.length) return null
  return (
    <div className="reports-chart-tooltip">
      <strong>{formatPeriod(label, groupBy)}</strong>
      {payload.map((item) => (
        <p key={item.dataKey}>
          <span style={{ backgroundColor: item.color }} />
          {item.name}: {formatAmount(Number(item.value))}
        </p>
      ))}
    </div>
  )
}

function ReportCard({ children, className = '', icon: Icon, title, description }) {
  return (
    <section className={`report-card${className ? ` ${className}` : ''}`}>
      <header className="report-card-heading">
        <span className="report-card-icon">
          <Icon aria-hidden="true" size={17} />
        </span>
        <div>
          <h2>{title}</h2>
          {description && <p>{description}</p>}
        </div>
      </header>
      {children}
    </section>
  )
}

function ReportsPage() {
  const { user } = useAuth()
  const { convertFromBase, currency, formatAmount, fractionDigits } = useCurrency()
  const [period, setPeriod] = useState('this_month')
  const [customFrom, setCustomFrom] = useState(format(startOfMonth(TODAY), 'yyyy-MM-dd'))
  const [customTo, setCustomTo] = useState(format(TODAY, 'yyyy-MM-dd'))
  const [report, setReport] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)
  useRealtimeRefresh(
    user?.id,
    ['transactions', 'savings_goals', 'budgets'],
    () => setRefreshKey((key) => key + 1),
  )
  const range = useMemo(
    () => getRange(period, customFrom, customTo),
    [period, customFrom, customTo],
  )
  const dayCount = range.isValid
    ? differenceInCalendarDays(
        parseISO(range.to),
        parseISO(range.from),
      ) + 1
    : 0
  const groupBy = period === 'this_year' || dayCount > 62 ? 'month' : 'day'

  useEffect(() => {
    if (!range.isValid) return undefined

    const controller = new AbortController()
    let active = true

    async function loadReport() {
      setIsLoading(true)
      setLoadError('')
      setReport(null)
      try {
        const result = await getFinancialReport({
          userId: user?.id,
          from: range.from,
          to: range.to,
          groupBy,
          signal: controller.signal,
        })
        if (active) setReport(result)
      } catch (error) {
        if (!active || controller.signal.aborted) return
        console.error('Unable to load Finance Tracker financial reports.', error)
        setLoadError('Your financial report could not be loaded. Please try again.')
      } finally {
        if (active && !controller.signal.aborted) setIsLoading(false)
      }
    }

    loadReport()
    return () => {
      active = false
      controller.abort()
    }
  }, [groupBy, range.from, range.isValid, range.to, refreshKey, user?.id])

  const activeReport = range.isValid ? report : null
  const displayError = range.isValid ? loadError : 'Choose a valid start and end date.'
  const reportIsLoading = range.isValid && isLoading
  const totals = activeReport?.totals || zeroTotals
  const series = activeReport?.series || []
  const categories = activeReport?.categories || []
  const largestExpenses = activeReport?.largestExpenses || []
  const savings = activeReport?.savings || {
    totalSaved: 0,
    totalTarget: 0,
    activeGoals: 0,
    completedGoals: 0,
    contributedInPeriod: 0,
    withdrawnInPeriod: 0,
  }
  const insights = buildInsights(activeReport)
  const savingsProgress =
    savings.totalTarget > 0
      ? Math.min(100, Math.round((savings.totalSaved / savings.totalTarget) * 100))
      : 0
  const trendTitle =
    period === 'this_year'
      ? 'Annual financial trends'
      : period === 'this_month' || period === 'last_month'
        ? 'Monthly spending trends'
        : 'Spending trends'
  const formattedRange =
    range.isValid
      ? `${format(parseISO(range.from), 'MMM d, yyyy')} – ${format(
          parseISO(range.to),
          'MMM d, yyyy',
        )}`
      : ''

  function exportReport() {
    if (!activeReport) return
    const convert = (amount) => {
      const converted = convertFromBase(Number(amount))
      return converted === null ? null : Number(converted.toFixed(fractionDigits))
    }
    const valuesToConvert = [
      totals.income,
      totals.expenses,
      totals.net,
      totals.transfers,
      ...series.flatMap((item) => [item.income, item.expenses, item.net, item.balance]),
      ...categories.map((item) => item.amount),
      ...largestExpenses.map((item) => item.amount),
      savings.totalSaved,
      savings.totalTarget,
      savings.contributedInPeriod,
      savings.withdrawnInPeriod,
    ]
    if (valuesToConvert.some((amount) => convert(amount) === null)) {
      setLoadError('Export is unavailable because current exchange rates could not be loaded.')
      return
    }

    const csvRows = [
      ['Finance Tracker financial report'],
      ['Date range', range.from, range.to],
      ['Display currency', currency],
      [],
      ['Summary', `Amount (${currency})`],
      ['Income', convert(totals.income)],
      ['Expenses', convert(totals.expenses)],
      ['Net cash flow', convert(totals.net)],
      ['Transfers', convert(totals.transfers)],
      ['Transaction count', totals.transactionCount],
      [],
      ['Period', 'Income', 'Expenses', 'Net cash flow', 'Cumulative net flow'],
      ...series.map((item) => [
        item.period,
        convert(item.income),
        convert(item.expenses),
        convert(item.net),
        convert(item.balance),
      ]),
      [],
      ['Spending by category', `Amount (${currency})`],
      ...categories.map((item) => [item.category, convert(item.amount)]),
      [],
      ['Largest expenses', 'Date', 'Category', `Amount (${currency})`, 'Account'],
      ...largestExpenses.map((item) => [
        item.title,
        item.date,
        item.category,
        convert(item.amount),
        item.account,
      ]),
      [],
      ['Savings goals', `Amount (${currency})`],
      ['Saved', convert(savings.totalSaved)],
      ['Targets', convert(savings.totalTarget)],
      ['Contributions in period', convert(savings.contributedInPeriod)],
      ['Withdrawals in period', convert(savings.withdrawnInPeriod)],
    ]
    const escapeCsv = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`
    const csv = csvRows.map((row) => row.map(escapeCsv).join(',')).join('\r\n')
    const blob = new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' })
    const downloadUrl = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = downloadUrl
    link.download = `finance-tracker-report-${range.from}-to-${range.to}.csv`
    document.body.append(link)
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000)
  }

  const metricCards = [
    { title: 'Income', amount: totals.income, icon: ArrowUpRight, tone: 'report-income' },
    { title: 'Expenses', amount: totals.expenses, icon: ArrowDownRight, tone: 'report-expenses' },
    { title: 'Net cash flow', amount: totals.net, icon: Activity, tone: 'report-net' },
    {
      title: 'Transactions',
      amount: totals.transactionCount.toLocaleString('en-KE'),
      icon: Scale,
      tone: 'report-count',
      isCount: true,
    },
  ]

  return (
    <div className="reports-page">
      <header className="reports-page-heading">
        <div>
          <p className="eyebrow">YOUR FINANCE TRACKER SPACE</p>
          <h1>Reports &amp; insights</h1>
          <p>A clearer picture of the choices shaping your financial story.</p>
        </div>
        <button
          className="secondary-button report-export-button"
          disabled={!activeReport || reportIsLoading}
          onClick={exportReport}
          type="button"
        >
          <Download aria-hidden="true" size={16} />
          Export report
        </button>
      </header>

      <section aria-label="Report filters" className="reports-filter-card">
        <div className="reports-period-picker">
          <label htmlFor="report-period">Report period</label>
          <select
            id="report-period"
            onChange={(event) => setPeriod(event.target.value)}
            value={period}
          >
            <option value="this_week">This week</option>
            <option value="this_month">This month</option>
            <option value="last_month">Last month</option>
            <option value="this_year">This year</option>
            <option value="custom">Custom date range</option>
          </select>
        </div>
        {period === 'custom' && (
          <div className="reports-custom-dates">
            <label>
              <span>From</span>
              <input
                max={customTo || undefined}
                onChange={(event) => setCustomFrom(event.target.value)}
                type="date"
                value={customFrom}
              />
            </label>
            <label>
              <span>To</span>
              <input
                min={customFrom || undefined}
                max={format(TODAY, 'yyyy-MM-dd')}
                onChange={(event) => setCustomTo(event.target.value)}
                type="date"
                value={customTo}
              />
            </label>
          </div>
        )}
        <div aria-live="polite" className="reports-range-label">
          <span className="reports-range-dot" />
          {formattedRange}
        </div>
      </section>

      {displayError && (
        <p className="transaction-alert" role="alert">
          {displayError}
          {activeReport && loadError && (
            <button
              className="report-inline-retry"
              onClick={() => setRefreshKey((current) => current + 1)}
              type="button"
            >
              Retry
            </button>
          )}
        </p>
      )}

      {!range.isValid ? (
        <div className="reports-state">
          <h2>Choose a valid date range</h2>
          <p>The start date must be on or before the end date.</p>
        </div>
      ) : reportIsLoading && !activeReport ? (
        <div className="reports-state" role="status">Preparing your financial picture...</div>
      ) : !activeReport ? (
        <div className="reports-state">
          <h2>Your report is waiting</h2>
          <p>Check your connection, then reload this report.</p>
          <button
            className="secondary-button"
            onClick={() => setRefreshKey((current) => current + 1)}
            type="button"
          >
            Try again
          </button>
        </div>
      ) : (
        <>
          <section aria-label="Financial summary" className="reports-metrics">
            {metricCards.map(({ title, amount, icon: Icon, tone, isCount }) => (
              <article className={`reports-metric-card ${tone}`} key={title}>
                <span className="reports-metric-icon">
                  <Icon aria-hidden="true" size={18} />
                </span>
                <div>
                  <p>{title}</p>
                  <strong>{isCount ? amount : formatAmount(amount)}</strong>
                </div>
              </article>
            ))}
          </section>

          {reportIsLoading && (
            <p className="reports-refreshing" role="status">Updating report...</p>
          )}

          <div className="reports-grid">
            <ReportCard
              description="Income and expenses over the selected period"
              icon={Activity}
              title="Income vs. expenses"
            >
              {series.length === 0 || totals.transactionCount === 0 ? (
                <div className="report-empty-chart">No transaction activity in this range.</div>
              ) : (
                <div className="report-chart">
                  <ResponsiveContainer height="100%" width="100%">
                    <BarChart data={series} margin={{ top: 8, right: 6, left: 3, bottom: 0 }}>
                      <CartesianGrid stroke="#f0eaf0" strokeDasharray="3 4" vertical={false} />
                      <XAxis
                        axisLine={false}
                        dataKey="period"
                        tickFormatter={(value) => formatPeriod(value, groupBy)}
                        tickLine={false}
                        tick={{ fill: '#8a7c8e', fontSize: 9 }}
                      />
                      <YAxis
                        axisLine={false}
                        tickFormatter={(value) => formatAmount(Number(value))}
                        tickLine={false}
                        tick={{ fill: '#8a7c8e', fontSize: 9 }}
                        width={75}
                      />
                      <Tooltip
                        content={
                          <ReportTooltip
                            formatAmount={formatAmount}
                            groupBy={groupBy}
                          />
                        }
                      />
                      <Bar dataKey="income" fill="#55a984" name="Income" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="expenses" fill="#e97991" name="Expenses" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
              <div className="reports-chart-legend">
                <span><i className="legend-income" /> Income</span>
                <span><i className="legend-expenses" /> Expenses</span>
              </div>
            </ReportCard>

            <ReportCard
              description="How your spending moved over time"
              icon={TrendingDown}
              title={trendTitle}
            >
              {series.length === 0 || totals.transactionCount === 0 ? (
                <div className="report-empty-chart">Spending trends will appear when you have expenses.</div>
              ) : (
                <div className="report-chart">
                  <ResponsiveContainer height="100%" width="100%">
                    <AreaChart data={series} margin={{ top: 8, right: 6, left: 3, bottom: 0 }}>
                      <defs>
                        <linearGradient id="spendingFill" x1="0" x2="0" y1="0" y2="1">
                          <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.24} />
                          <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="#f0eaf0" strokeDasharray="3 4" vertical={false} />
                      <XAxis
                        axisLine={false}
                        dataKey="period"
                        tickFormatter={(value) => formatPeriod(value, groupBy)}
                        tickLine={false}
                        tick={{ fill: '#8a7c8e', fontSize: 9 }}
                      />
                      <YAxis
                        axisLine={false}
                        tickFormatter={(value) => formatAmount(Number(value))}
                        tickLine={false}
                        tick={{ fill: '#8a7c8e', fontSize: 9 }}
                        width={75}
                      />
                      <Tooltip
                        content={
                          <ReportTooltip
                            formatAmount={formatAmount}
                            groupBy={groupBy}
                          />
                        }
                      />
                      <Area
                        dataKey="expenses"
                        fill="url(#spendingFill)"
                        name="Expenses"
                        stroke="#8b5cf6"
                        strokeWidth={2.5}
                        type="monotone"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </ReportCard>

            <ReportCard
              description="Where your spending went"
              icon={Target}
              title="Spending by category"
            >
              {categories.length === 0 ? (
                <div className="report-empty-chart">No categorized expenses in this range.</div>
              ) : (
                <div className="report-category-layout">
                  <div className="report-donut-chart">
                    <ResponsiveContainer height="100%" width="100%">
                      <PieChart>
                        <Pie
                          data={categories}
                          dataKey="amount"
                          innerRadius="60%"
                          nameKey="category"
                          outerRadius="84%"
                          paddingAngle={3}
                          stroke="none"
                        >
                          {categories.map((category, index) => (
                            <Cell
                              fill={chartColors[index % chartColors.length]}
                              key={category.category}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value) => formatAmount(Number(value))}
                          contentStyle={{
                            border: '1px solid #eee1e9',
                            borderRadius: '11px',
                            fontSize: '10px',
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <ul className="report-category-list">
                    {categories.map((category, index) => (
                      <li key={category.category}>
                        <span
                          className="report-category-swatch"
                          style={{ backgroundColor: chartColors[index % chartColors.length] }}
                        />
                        <span className="report-category-name">{category.category}</span>
                        <strong>{formatAmount(category.amount)}</strong>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </ReportCard>

            <ReportCard
              description="Cumulative income minus expenses; starts at zero and excludes opening balances and transfers"
              icon={Scale}
              title="Financial balance history"
            >
              {series.length === 0 || totals.transactionCount === 0 ? (
                <div className="report-empty-chart">Balance movement will appear when transactions are recorded.</div>
              ) : (
                <div className="report-chart">
                  <ResponsiveContainer height="100%" width="100%">
                    <LineChart data={series} margin={{ top: 8, right: 6, left: 3, bottom: 0 }}>
                      <CartesianGrid stroke="#f0eaf0" strokeDasharray="3 4" vertical={false} />
                      <XAxis
                        axisLine={false}
                        dataKey="period"
                        tickFormatter={(value) => formatPeriod(value, groupBy)}
                        tickLine={false}
                        tick={{ fill: '#8a7c8e', fontSize: 9 }}
                      />
                      <YAxis
                        axisLine={false}
                        tickFormatter={(value) => formatAmount(Number(value))}
                        tickLine={false}
                        tick={{ fill: '#8a7c8e', fontSize: 9 }}
                        width={75}
                      />
                      <Tooltip
                        content={
                          <ReportTooltip
                            formatAmount={formatAmount}
                            groupBy={groupBy}
                          />
                        }
                      />
                      <Line
                        dataKey="balance"
                        dot={false}
                        name="Cumulative net flow"
                        stroke="#d6a85a"
                        strokeWidth={2.5}
                        type="monotone"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </ReportCard>

            <ReportCard
              className="report-wide"
              description="The largest expenses in the selected period"
              icon={ArrowDownRight}
              title="Largest expenses"
            >
              {largestExpenses.length === 0 ? (
                <div className="report-inline-empty">No expenses to rank for this date range.</div>
              ) : (
                <div className="largest-expenses-list">
                  {largestExpenses.map((expense, index) => (
                    <article key={expense.id}>
                      <span className="expense-rank">{String(index + 1).padStart(2, '0')}</span>
                      <div>
                        <strong>{expense.title}</strong>
                        <span>
                          {expense.category} ·                           {format(parseISO(expense.date), 'MMM d')}
                          {expense.account ? ` · ${expense.account}` : ''}
                        </span>
                      </div>
                      <strong className="largest-expense-amount">−{formatAmount(expense.amount)}</strong>
                    </article>
                  ))}
                </div>
              )}
            </ReportCard>

            <ReportCard
              description="Your current progress across all savings goals"
              icon={PiggyBank}
              title="Savings progress"
            >
              {savings.totalTarget > 0 ? (
                <div className="report-savings-content">
                  <div className="report-savings-total">
                    <strong>{formatAmount(savings.totalSaved)}</strong>
                    <span>of {formatAmount(savings.totalTarget)} goal targets</span>
                  </div>
                  <div
                    aria-label={`Savings goals ${savingsProgress}% funded`}
                    aria-valuemax={100}
                    aria-valuemin={0}
                    aria-valuenow={savingsProgress}
                    className="report-savings-track"
                    role="progressbar"
                  >
                    <span style={{ width: `${savingsProgress}%` }} />
                  </div>
                  <div className="report-savings-stats">
                    <span>{savingsProgress}% funded</span>
                    <span>
                      {savings.completedGoals} completed · {savings.activeGoals} active
                    </span>
                  </div>
                  <div className="report-savings-period">
                    <span>Added this period</span>
                    <strong>+{formatAmount(savings.contributedInPeriod)}</strong>
                    <span>Withdrawn</span>
                    <strong>−{formatAmount(savings.withdrawnInPeriod)}</strong>
                  </div>
                </div>
              ) : (
                <div className="report-inline-empty">
                  Create a savings goal to see your progress here.
                </div>
              )}
            </ReportCard>

            <ReportCard
              description="Compare your spending with the limits you set"
              icon={Target}
              title="Budget performance"
            >
              {activeReport.budgetsConfigured ? (
                <div className="report-inline-empty">
                  Budget data is not available for this report period.
                </div>
              ) : (
                <div className="report-budget-empty">
                  <span><Target aria-hidden="true" size={21} /></span>
                  <strong>No connected budget data</strong>
                  <p>
                    Budget tracking is not connected yet, so we are not showing
                    estimated limits or comparisons.
                  </p>
                </div>
              )}
            </ReportCard>

            <ReportCard
              className="report-wide"
              description="Observations based on this period's transactions and savings activity"
              icon={Lightbulb}
              title="Your financial insights"
            >
              {insights.length === 0 ? (
                <div className="report-inline-empty">
                  Add transactions or savings activity to reveal useful patterns.
                </div>
              ) : (
                <ul className="reports-insights-list">
                  {insights.map(({ icon: Icon, text, tone }) => (
                    <li className={tone} key={text}>
                      <span><Icon aria-hidden="true" size={17} /></span>
                      <p>{text}</p>
                    </li>
                  ))}
                </ul>
              )}
            </ReportCard>
          </div>
        </>
      )}
    </div>
  )
}

export default ReportsPage
