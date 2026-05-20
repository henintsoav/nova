import Card from '../../components/ui/Card'
import './GamePage.css'

const COLOR = '#ff4655'

const ROSTER = [
  { ign: 'RedSight',   role: 'Duelist',   initial: 'R' },
  { ign: 'Phantom7',   role: 'Initiator', initial: 'P' },
  { ign: 'IceWall',    role: 'Controller', initial: 'I' },
  { ign: 'Sentinel1',  role: 'Sentinel',  initial: 'S' },
  { ign: 'NovaFrag',   role: 'Flex',      initial: 'N' },
]

const SCHEDULE = [
  { date: '2025-06-05', opponent: 'Clutch Kings',   format: 'Bo3', status: 'Scheduled' },
  { date: '2025-06-12', opponent: 'Spike Rushers',  format: 'Bo1', status: 'Scheduled' },
  { date: '2025-05-22', opponent: 'Operator Squad', format: 'Bo3', status: 'Loss' },
  { date: '2025-05-14', opponent: 'Flash Point',    format: 'Bo1', status: 'Win' },
]

export default function Valorant() {
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
              <span className="badge badge-accent" style={{ color: COLOR, background: `${COLOR}18` }}>FPS</span>
              <span>5 players</span>
              <span>·</span>
              <span>Avg. Diamond+</span>
            </div>
          </div>
        </div>
      </div>

      <div className="game-section">
        <h2 className="game-section-title">Roster</h2>
        <div className="roster-grid">
          {ROSTER.map((p) => (
            <Card key={p.ign} className="roster-card" glow>
              <div className="roster-avatar" style={{ background: COLOR, borderColor: `${COLOR}66` }}>
                {p.initial}
              </div>
              <span className="roster-name">{p.ign}</span>
              <span className="roster-role">{p.role}</span>
            </Card>
          ))}
        </div>
      </div>

      <div className="game-section">
        <h2 className="game-section-title">Schedule &amp; Results</h2>
        <Card>
          <table className="schedule-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Opponent</th>
                <th>Format</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {SCHEDULE.map((m) => (
                <tr key={m.date + m.opponent}>
                  <td>{m.date}</td>
                  <td>{m.opponent}</td>
                  <td>{m.format}</td>
                  <td>
                    <span className={`badge ${m.status === 'Win' ? 'badge-success' : m.status === 'Loss' ? 'badge-danger' : 'badge-accent'}`}>
                      {m.status}
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
