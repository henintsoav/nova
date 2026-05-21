import { useI18n } from '../../contexts/I18nContext'
import RosterPanel from '../../components/roster/RosterPanel'
import './GamePage.css'

const COLOR = '#ff4655'

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
        <RosterPanel game="valorant" color={COLOR} roleLabels={t.valorant.roles} />
      </div>
    </div>
  )
}
