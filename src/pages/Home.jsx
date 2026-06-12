import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useI18n } from '../contexts/I18nContext'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import JoinModal from '../components/join/JoinModal'
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

const RECRUIT_GAMES = ['lol', 'wildrift', 'valorant', 'audio', 'event']

export default function Home() {
  const { t }       = useI18n()
  const { profile } = useAuth()
  const canManage   = profile?.role === 'founder' || profile?.role === 'staff'

  const [joinOpen,    setJoinOpen]    = useState(false)
  const [recruitment, setRecruitment] = useState({})

  useEffect(() => {
    supabase.from('recruitment_status').select('game, is_open').then(({ data }) => {
      const map = {}
      for (const r of data ?? []) map[r.game] = r.is_open
      setRecruitment(map)
    })
  }, [])

  async function toggleRecruit(game) {
    const next = !recruitment[game]
    setRecruitment(prev => ({ ...prev, [game]: next }))
    await supabase.from('recruitment_status').update({ is_open: next, updated_at: new Date().toISOString() }).eq('game', game)
  }

  const STATS = [
    { value: 'Structure',   label: t.home.stats_rosters },
    { value: 'Pôle Créa.', label: t.home.stats_scrims  },
    { value: 'Communauté', label: t.home.stats_founded  },
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
            <span className="hero-title-brand">AXWELD</span>
          </h1>
          <p className="hero-subtitle">
            {t.home.subtitle_1}<br />{t.home.subtitle_2}
          </p>
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

      {/* ── About ────────────────────────────────────────────── */}
      <section className="section about-section">
        <div className="container">
          <p className="section-label">{t.about.label}</p>
          <h2 className="section-title">{t.about.title}</h2>
          <div className="divider" />
          <div className="about-inner">
            <div className="about-text">
              <p>{t.about.p1}</p>
              <p>{t.about.p2}</p>
              <p>{t.about.p3}</p>
              <p>{t.about.p4}</p>
            </div>
            <div className="about-aside">
              <div className="about-location">
                <span className="about-location-dot" aria-hidden>◉</span>
                {t.about.location}
              </div>
              <div className="about-values">
                <span className="about-value">{t.about.value_1}</span>
                <span className="about-value">{t.about.value_2}</span>
                <span className="about-value">{t.about.value_3}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Recrutements ─────────────────────────────────────── */}
      <section className="section container">
        <p className="section-label">{t.recruit.label}</p>
        <h2 className="section-title">{t.recruit.label}</h2>
        <div className="divider" />
        <div className="recruit-grid">
          {RECRUIT_GAMES.map((game) => {
            const isOpen = !!recruitment[game]
            return (
              <div key={game} className={`recruit-row ${isOpen ? 'open' : 'closed'}`}>
                <span className="recruit-name">{t.recruit[game]}</span>
                <div className="recruit-right">
                  <span className={`recruit-badge ${isOpen ? 'open' : 'closed'}`}>
                    {isOpen ? t.recruit.open : t.recruit.closed}
                  </span>
                  {canManage && (
                    <button className="recruit-toggle" onClick={() => toggleRecruit(game)}>
                      {isOpen ? t.recruit.toggle_close : t.recruit.toggle_open}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* ── Join CTA ─────────────────────────────────────────── */}
      <section className="join-cta">
        <div className="join-cta-glow" />
        <div className="container join-cta-inner">
          <h2 className="join-cta-title">{t.home.join_title}</h2>
          <p className="join-cta-sub">{t.home.join_sub}</p>
          <div className="hero-cta">
            <Button variant="primary" size="lg" onClick={() => setJoinOpen(true)}>
              {t.home.join_cta}
            </Button>
          </div>
        </div>
      </section>

      <JoinModal open={joinOpen} onClose={() => setJoinOpen(false)} />

    </div>
  )
}
