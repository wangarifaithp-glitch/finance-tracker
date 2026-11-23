export const initialNotifications = [
  { id: 'budget-warning', type: 'Budget warning', icon: 'warning', title: 'Groceries budget is at 82%', message: 'You have KSh 2,700 remaining in your groceries budget this month.', time: '18 minutes ago', read: false },
  { id: 'budget-exceeded', type: 'Budget exceeded', icon: 'exceeded', title: 'Entertainment budget exceeded', message: 'Spending is KSh 1,250 over the KSh 8,000 monthly limit.', time: '2 hours ago', read: false },
  { id: 'upcoming-bill', type: 'Upcoming bill', icon: 'bill', title: 'Internet bill due in 3 days', message: 'A payment of KSh 3,500 is scheduled for November 26.', time: 'Today', read: false },
  { id: 'savings-milestone', type: 'Savings milestone', icon: 'savings', title: 'Emergency fund reached 75%', message: 'You have saved KSh 75,000 toward your KSh 100,000 goal.', time: 'Yesterday', read: true },
  { id: 'financial-reminder', type: 'Financial reminder', icon: 'reminder', title: 'Time for a weekly money check-in', message: 'Review recent spending and update the rest of your weekly plan.', time: 'Yesterday', read: true },
  { id: 'monthly-summary', type: 'Monthly summary', icon: 'summary', title: 'October summary is ready', message: 'You saved 12% more than in September. Open your report to see the details.', time: 'Nov 1', read: true },
]

export function loadNotifications() {
  try {
    const saved = window.localStorage.getItem('finance-tracker.notifications.v1')
    return saved ? JSON.parse(saved) : initialNotifications
  } catch {
    return initialNotifications
  }
}
