import { useState } from 'react'
import { ChartNoAxesColumnIncreasing } from 'lucide-react'
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import { spendingByRange as defaultSpendingByRange } from '../../data/dashboardData.js'
import { useCurrency } from '../../context/useCurrency.js'
import WidgetCard, { WidgetState } from './WidgetCard.jsx'

const ranges = [
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'year', label: 'This Year' },
]

function SpendingOverview({ loading = false, spendingData = defaultSpendingByRange }) {
  const [range, setRange] = useState('month')
  const { formatAmount } = useCurrency()
  const spending = spendingData[range] || { total: 0, categories: [] }
  const categories = spending.categories.map((category) => ({
    ...category,
    percentage: Math.round((category.amount / spending.total) * 100),
  }))

  return (
    <WidgetCard
      action={
        <label className="widget-select-wrap">
          <span className="visually-hidden">Spending date range</span>
          <select
            className="widget-select"
            onChange={(event) => setRange(event.target.value)}
            value={range}
          >
            {ranges.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      }
      className="spending-widget"
      icon={ChartNoAxesColumnIncreasing}
      title="Spending Overview"
    >
      {loading || categories.length === 0 ? (
        <WidgetState
          emptyMessage="Your spending breakdown will appear after you add transactions."
          emptyTitle="No spending to show"
          loading={loading}
        />
      ) : (
        <div className="spending-layout">
          <div className="spending-chart-wrap">
            <ResponsiveContainer height="100%" width="100%">
              <PieChart>
                <Pie
                  data={categories}
                  dataKey="amount"
                  innerRadius="62%"
                  outerRadius="88%"
                  paddingAngle={3}
                  stroke="none"
                >
                  {categories.map((category) => (
                    <Cell fill={category.color} key={category.name} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => formatAmount(Number(value))}
                  contentStyle={{
                    border: '1px solid #eee1e9',
                    borderRadius: '12px',
                    boxShadow: '0 8px 24px rgb(53 28 61 / 12%)',
                    fontSize: '12px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div aria-live="polite" className="donut-center">
              <strong>{formatAmount(spending.total)}</strong>
              <span>Total Spent</span>
            </div>
          </div>
          <ul aria-label="Spending by category" className="category-list">
            {categories.map((category) => (
              <li key={category.name}>
                <span
                  aria-hidden="true"
                  className="category-dot"
                  style={{ backgroundColor: category.color }}
                />
                <span className="category-name">{category.name}</span>
                <span className="category-percent">{category.percentage}%</span>
                <span className="category-amount">
                  {formatAmount(category.amount)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </WidgetCard>
  )
}

export default SpendingOverview
