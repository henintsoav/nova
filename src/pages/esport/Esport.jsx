import { Link } from 'react-router-dom'
import Card from '../../components/ui/Card'
import './Esport.css'

const TEAMS = [
  {
    slug: 'lol',
    name: 'League of Legends',
    short: 'LoL',
    tag: 'PC',
    color: '#C69B3A',
    to: '/esport/lol',
    players: 5,
    rank: 'Diamond+',
  },
  {
    slug: 'wildrift',
    name: 'Wild Rift',
    short: 'WR',
    tag: 'Mobile',
    color: '#1a9fff',
    to: '/esport/wildrift',
    players: 5,
    rank: 'Emerald+',
  },
  {
    slug: 'valorant',
    name: 'Valorant',
    short: 'VAL',
    tag: 'FPS',
    color: '#ff4655',
    to: '/esport/valorant',
    players: 5,
    rank: 'Diamond+',
  },
]

export default function Esport() {
  return (
    <div className="page container">
      <p className="section-label">Our Divisions</p>
      <h1 className="section-title">Esport</h1>
      <div className="divider" />

      <div className="esport-grid">
        {TEAMS.map((team) => (
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
                  <span><strong>{team.players}</strong> players</span>
                  <span>·</span>
                  <span>Avg rank: <strong>{team.rank}</strong></span>
                </div>
                <span className="esport-team-link">View team →</span>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
