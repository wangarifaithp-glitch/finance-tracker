export function isIsoDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value
}

export function monthRange(month) {
  if (!/^\d{4}-\d{2}$/.test(month)) return null
  const start = `${month}-01`
  if (!isIsoDate(start)) return null
  const [year, monthNumber] = month.split('-').map(Number)
  const next = new Date(Date.UTC(year, monthNumber, 1))
  const nextMonth = next.toISOString().slice(0, 10)
  return { start, endExclusive: nextMonth }
}
