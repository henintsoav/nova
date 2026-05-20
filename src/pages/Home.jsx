import { Link } from 'react-router-dom'
import { useI18n } from '../contexts/I18nContext'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import './Home.css'

const GAMES = (t) => [
  {
    slug: 'lol',
    name: 'League of Legends',
    tag: t.lol.tag,
    color: '#C69B3A',
    to: '/esport/lol',
    description: t.home.lol_desc,
  },
  {
    slug: 'wildrift',
    name: 'Wild Rift',
    tag: t.wildrift.tag,
    color: '#1a9fff',
    to: '/esport/wildrift',
    description: t.home.wr_desc,
  },
  {
    slug: 'valorant',
    name: 'Valorant',
    tag: t.valorant.tag,
    color: '#ff4655',
    to: '/esport/valorant',
    description: t.home.val_desc,
  },
]

export default function Home() {
  const { t } = useI18n()

  const STATS = [
    { value: '3',   label: t.home.stats_rosters },
    { value: '12+', label: t.home.stats_members },
    { value: '50+', label: t.home.stats_scrims },
    { value: '2024', label: t.home.stats_founded },
  ]

  return (
    <div className="home">

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="hero">
        <div className="hero-glow hero-glow-1" />
        <div className="hero-glow hero-glow-2" />
        <div className="hero-grid" />

        <div className="container hero-content animate-fade-up">
          <p className="hero-label">{t.home.org_tag}</p>
          <h1 className="hero-title">
            {t.home.hero_line1}<br />
            <span className="hero-title-brand">NOVA</span>
          </h1>
          <p className="hero-subtitle">{t.home.subtitle}</p>
          <div className="hero-cta">
            <Button variant="primary" size="lg">
              <Link to="/esport">{t.home.cta_explore}</Link>
            </Button>
            <Button variant="ghost" size="lg">
              <Link to="/event">{t.home.cta_events}</Link>
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
        <p className="section-label">{t.home.teams_label}</p>
        <h2 className="section-title">{t.home.teams_title}</h2>
        <div className="divider" />
        <div className="games-grid">
          {GAMES(t).map((game) => (
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
                  <span className="game-card-cta">{t.home.view_roster}</span>
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
          <h2 className="join-cta-title">{t.home.join_title}</h2>
          <p className="join-cta-sub">{t.home.join_sub}</p>
          <div className="hero-cta">
            <Button variant="primary" size="lg">
              <Link to="/scrims">{t.home.join_cta}</Link>
            </Button>
          </div>
        </div>
      </section>

    </div>
  )
}
