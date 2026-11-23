import { useId } from 'react'

function WidgetCard({ action, className = '', icon: Icon, title, children }) {
  const titleId = useId()

  return (
    <section
      aria-labelledby={titleId}
      className={`widget-card ${className}`.trim()}
    >
      <header className="widget-header">
        <div className="widget-heading">
          {Icon && (
            <span className="widget-icon">
              <Icon aria-hidden="true" size={18} strokeWidth={2.2} />
            </span>
          )}
          <h2 id={titleId}>{title}</h2>
        </div>
        {action}
      </header>
      <div className="widget-body">{children}</div>
    </section>
  )
}

export function WidgetState({
  emptyTitle = 'Nothing here yet',
  emptyMessage = 'Your information will appear here when it is available.',
  loading = false,
}) {
  if (loading) {
    return (
      <div aria-busy="true" aria-label="Loading" className="widget-loading">
        <span />
        <span />
        <span />
      </div>
    )
  }

  return (
    <div className="widget-empty-state" role="status">
      <strong>{emptyTitle}</strong>
      <span>{emptyMessage}</span>
    </div>
  )
}

export default WidgetCard
