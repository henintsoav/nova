import { useI18n } from '../../contexts/I18nContext'
import Card from '../../components/ui/Card'
import './GamePage.css'

const COLOR = '#1a9fff'

const ROSTER = [
  { ign: 'PrismaTop',    role: 'Baron',   initial: 'P' },
  { ign: 'ShadowJG',     role: 'Jungle',  initial: 'S' },
  { ign: 'NovaCore',     role: 'Mid',     initial: 'N' },
  { ign: 'DragonADC',    role: 'Dragon',  initial: 'D' },
  { ign: 'ShieldBearer', role: 'Support', initial: 'S' },
]

const SCHEDULE = [
  { date: '2025-06-03', opponent: 'Storm Rising',  format: 'Bo3', status: 'scheduled' },
  { date: '2025-06-10', opponent: 'Apex Mobile',   format: 'Bo1', status: 'scheduled' },
  { date: '2025-05-20', opponent: 'Pixel Raiders', format: 'Bo3', status: 'win' },
  { date: '2025-05-12', opponent: 'Blue Flame',    format: 'Bo1', status: 'win' },
]

const STATUS_BADGE = { win: 'badge-success', loss: 'badge-danger', scheduled: 'badge-accent' }

export default function WildRift() {
  const { t } = useI18n()

  return (
    <div className="page container">
      <div className="game-page-hero">
        <div className="game-page-glow" style={{ background: `radial-gradient(circle, ${COLOR}, transparent 70%)` }} />
        <div className="game-page-hero-inner">
          <div className="game-page-icon" style={{ color: COLOR, borderColor: `${COLOR}44`, background: `${COLOR}12` }}>
            WR
          </div>
          <div className="game-page-headings">
            <h1 className="game-page-title">Wild Rift</h1>
            <div className="game-page-meta">
              <span className="badge badge-accent" style={{ color: COLOR, background: `${COLOR}18` }}>{t.wildrift.tag}</span>
              <span>{t.wildrift.players}</span>
              <span>·</span>
              <span>{t.wildrift.rank}</span>
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
              <span className="roster-role">{t.wildrift.roles[p.role]}</span>
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
