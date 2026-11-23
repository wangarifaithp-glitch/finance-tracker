import { ArrowLeft, ArrowRight } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'

function SectionPage({ title, description }) {
  const location = useLocation()
  const query = new URLSearchParams(location.search).get('q')

  return (
    <section aria-labelledby="section-title" className="section-page">
      <p className="eyebrow">YOUR FINANCE TRACKER SPACE</p>
      <h1 id="section-title">{title}</h1>
      <p className="section-description">{description}</p>
      {query && (
        <p className="search-summary">
          Search for <strong>“{query}”</strong> will be available when
          transactions are added.
        </p>
      )}
      <div className="section-empty-state">
        <span className="empty-state-mark">
          <span />
          <span />
          <span />
        </span>
        <p className="eyebrow">COMING TO LIFE</p>
        <h2>This space is ready for you.</h2>
        <p>
          We’re setting up the essentials first. This section will grow with
          your financial plans in the next stage.
        </p>
        <Link className="back-link" to="/">
          <ArrowLeft aria-hidden="true" size={16} />
          Back to dashboard
          <ArrowRight aria-hidden="true" className="back-link-trailing" size={15} />
        </Link>
      </div>
    </section>
  )
}

export default SectionPage
