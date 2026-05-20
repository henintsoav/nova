import { Link } from 'react-router-dom'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import './Home.css'

const GAMES = [
  {
    slug: 'lol',
    name: 'League of Legends',
    tag: 'PC',
    color: '#C69B3A',
    to: '/esport/lol',
    description: 'Our flagship PC roster competing in ranked ladders and national circuits.',
  },
  {
    slug: 'wildrift',
    name: 'Wild Rift',
    tag: 'MOBILE',
    color: '#1a9fff',
    to: '/esport/wildrift',
    description: 'Mobile excellence — grinding the Wild Rift competitive scene.',
  },
  {
    slug: 'valorant',
    name: 'Valorant',
    tag: 'FPS',
    color: '#ff4655',
    to: '/esport/valorant',
    description: 'Tactical FPS team pushing through VCT open qualifiers.',
  },
]

const STATS = [
  { value: '3', label: 'Active Rosters' },
  { value: '12+', label: 'Team Members' },
  { value: '50+', label: 'Scrims Played' },
  { value: '2024', label: 'Founded' },
]

export default function Home() {
  return (
    <div className="home">

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="hero">
        <div className="hero-glow hero-glow-1" />
        <div className="hero-glow hero-glow-2" />
        <div className="hero-grid" />

        <div className="container hero-content animate-fade-up">
          <p className="hero-label">Esports Organization</p>
          <h1 className="hero-title">
            WE ARE<br />
            <span className="hero-title-brand">NOVA</span>
          </h1>
          <p className="hero-subtitle">
            Competitive excellence across every game, every server, every match.
          </p>
          <div className="hero-cta">
            <Button variant="primary" size="lg" as={Link}>
              <Link to="/esport">Explore the team</Link>
            </Button>
            <Button variant="ghost" size="lg">
              <Link to="/event">Upcoming events</Link>
            </Button>
          </div>
        </div>

        <div className="hero-scroll-hint" aria-hidden>
          <span />
        </div>
      </section>

      {/* ── Stats ────────────────────────────────────────────── */}
      <section className="stats-bar">
        <div className="container stats-inner">
          {STATS.map(({ value, label }) => (
            <div key={label} className="stat-item">
              <span className="stat-value">{value}</span>
              <span className="stat-label">{label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Games ────────────────────────────────────────────── */}
      <section className="section container">
        <p className="section-label">Our Teams</p>
        <h2 className="section-title">Competing across 3 titles</h2>
        <div className="divider" />
        <div className="games-grid">
          {GAMES.map((game) => (
            <Link key={game.slug} to={game.to} className="game-card-link">
              <Card className="game-card" glow>
                <div
                  className="game-card-accent"
                  style={{ background: `linear-gradient(135deg, ${game.color}22, transparent)`, borderColor: `${game.color}44` }}
                />
                <div className="game-card-body">
                  <span className="badge badge-accent" style={{ color: game.color, background: `${game.color}18` }}>
                    {game.tag}
                  </span>
                  <h3 className="game-card-title">{game.name}</h3>
                  <p className="game-card-desc">{game.description}</p>
                  <span className="game-card-cta">View roster →</span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Join CTA ─────────────────────────────────────────── */}
      <section className="join-cta">
        <div className="join-cta-glow" />
        <div className="container join-cta-inner">
          <h2 className="join-cta-title">Ready to compete?</h2>
          <p className="join-cta-sub">Join the roster. Scrim with us. Level up together.</p>
          <div className="hero-cta">
            <Button variant="primary" size="lg">
              <Link to="/scrims">Access Scrims</Link>
            </Button>
          </div>
        </div>
      </section>

    </div>
  )
}
