import { Sprout } from 'lucide-react'

const now = new Date()

function WelcomeBanner() {
  const hour = now.getHours()
  const greeting =
    hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const today = new Intl.DateTimeFormat('en-KE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(now)

  return (
    <section aria-labelledby="welcome-title" className="welcome-banner">
      <div className="welcome-copy">
        <p className="welcome-date">{today}</p>
        <h1 id="welcome-title">
          {greeting}, <span>Peris.</span>
        </h1>
        <p className="welcome-message">
          Small, thoughtful steps can grow into something wonderful.
        </p>
      </div>
      <div aria-hidden="true" className="welcome-art">
        <div className="art-glow" />
        <div className="coin-stack coin-stack-back">
          <span />
          <span />
          <span />
        </div>
        <div className="coin-stack coin-stack-front">
          <span />
          <span />
        </div>
        <Sprout className="art-sprout" size={54} strokeWidth={1.4} />
        <span className="art-sparkle sparkle-one">✦</span>
        <span className="art-sparkle sparkle-two">✧</span>
      </div>
      <span className="welcome-decoration" />
    </section>
  )
}

export default WelcomeBanner
