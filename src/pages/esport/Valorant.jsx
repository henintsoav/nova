import { useI18n } from '../../contexts/I18nContext'
import Card from '../../components/ui/Card'
import './GamePage.css'

const COLOR = '#ff4655'

const ROSTER = [
  { ign: 'RedSight',  role: 'Duelist',    initial: 'R' },
  { ign: 'Phantom7',  role: 'Initiator',  initial: 'P' },
  { ign: 'IceWall',   role: 'Controller', initial: 'I' },
  { ign: 'Sentinel1', role: 'Sentinel',   initial: 'S' },
  { ign: 'NovaFrag',  role: 'Flex',       initial: 'N' },
]

const SCHEDULE = [
  { date: '2025-06-05', opponent: 'Clutch Kings',   format: 'Bo3', status: 'scheduled' },
  { date: '2025-06-12', opponent: 'Spike Rushers',  format: 'Bo1', status: 'scheduled' },
  { date: '2025-05-22', opponent: 'Operator Squad', format: 'Bo3', status: 'loss' },
  { date: '2025-05-14', opponent: 'Flash Point',    format: 'Bo1', status: 'win' },
]

const STATUS_BADGE = { win: 'badge-success', loss: 'badge-danger', scheduled: 'badge-accent' }

export default function Valorant() {
  const { t } = useI18n()

  return (
    <div className="page container">
      <div className="game-page-hero">
        <div className="game-page-glow" style={{ background: `radial-gradient(circle, ${COLOR}, transparent 70%)` }} />
        <div className="game-page-hero-inner">
          <div className="game-page-icon" style={{ color: COLOR, borderColor: `${COLOR}44`, background: `${COLOR}12` }}>
            VAL
          </div>
          <div className="game-page-headings">
            <h1 className="game-page-title">Valorant</h1>
            <div className="game-page-meta">
              <span className="badge badge-accent" style={{ color: COLOR, background: `${COLOR}18` }}>{t.valorant.tag}</span>
              <span>{t.valorant.players}</span>
              <span>·</span>
              <span>{t.valorant.rank}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="game-section">
        <h2 className="game-section-title">{t.game.roster}</h2>
        <div className="roster-grid">
          {ROSTER.map((p) => (
            <Card key={p.ign} className="roster-card" glow>
              <div className="roster-avatar" style={{ background: COLOR, borderColor: `${COLOR}66` }}>
                {p.initial}
              </div>
              <span className="roster-name">{p.ign}</span>
              <span className="roster-role">{t.valorant.roles[p.role]}</span>
            </Card>
          ))}
        </div>
      </div>

      <div className="game-section">
        <h2 className="game-section-title">{t.game.schedule}</h2>
        <Card>
          <table className="schedule-table">
            <thead>
              <tr>
                <th>{t.game.date}</th>
                <th>{t.game.opponent}</th>
                <th>{t.game.format}</th>
                <th>{t.game.status}</th>
              </tr>
            </thead>
            <tbody>
              {SCHEDULE.map((m) => (
                <tr key={m.date + m.opponent}>
                  <td>{m.date}</td>
                  <td>{m.opponent}</td>
                  <td>{m.format}</td>
                  <td>
                    <span className={`badge ${STATUS_BADGE[m.status]}`}>
                      {t.game[m.status]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  )
}
