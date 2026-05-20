import { Link } from 'react-router-dom'
import { useI18n } from '../../contexts/I18nContext'
import Card from '../../components/ui/Card'
import './Esport.css'

const TEAMS = (t) => [
  {
    slug: 'lol',
    name: 'League of Legends',
    short: 'LoL',
    tag: t.lol.tag,
    color: '#C69B3A',
    to: '/esport/lol',
    players: 5,
    rank: t.lol.rank,
  },
  {
    slug: 'wildrift',
    name: 'Wild Rift',
    short: 'WR',
    tag: t.wildrift.tag,
    color: '#1a9fff',
    to: '/esport/wildrift',
    players: 5,
    rank: t.wildrift.rank,
  },
  {
    slug: 'valorant',
    name: 'Valorant',
    short: 'VAL',
    tag: t.valorant.tag,
    color: '#ff4655',
    to: '/esport/valorant',
    players: 5,
    rank: t.valorant.rank,
  },
]

export default function Esport() {
  const { t } = useI18n()

  return (
    <div className="page container">
      <p className="section-label">{t.esport.label}</p>
      <h1 className="section-title">{t.esport.title}</h1>
      <div className="divider" />

      <div className="esport-grid">
        {TEAMS(t).map((team) => (
          <Link key={team.slug} to={team.to}>
            <Card className="esport-team-card" glow>
              <div className="esport-team-banner" style={{ background: `linear-gradient(135deg, ${team.color}22, var(--bg-card))` }}>
                <span className="esport-team-initial" style={{ color: team.color }}>
                  {team.short}
                </span>
              </div>
              <div className="esport-team-info">
                <div className="esport-team-header">
                  <h2 className="esport-team-name">{team.name}</h2>
                  <span className="badge badge-accent" style={{ color: team.color, background: `${team.color}18` }}>
                    {team.tag}
                  </span>
                </div>
                <div className="esport-team-meta">
                  <span><strong>{team.players}</strong> {t.esport.players}</span>
                  <span>·</span>
                  <span>{t.esport.avg_rank}: <strong>{team.rank}</strong></span>
                </div>
                <span className="esport-team-link">{t.esport.view_team}</span>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
