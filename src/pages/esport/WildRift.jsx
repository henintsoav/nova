import { useI18n } from '../../contexts/I18nContext'
import RosterPanel from '../../components/roster/RosterPanel'
import MatchResults from '../../components/roster/MatchResults'
import './GamePage.css'

const COLOR = '#1a9fff'

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
        <RosterPanel game="wildrift" color={COLOR} roleLabels={t.wildrift.roles} />
      </div>

      <div className="game-section">
        <h2 className="game-section-title">Résultats</h2>
        <MatchResults game="wildrift" />
      </div>
    </div>
  )
}
