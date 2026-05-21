import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useI18n } from '../../contexts/I18nContext'
import { hasCalendarAccess, getRoleLabel } from '../../lib/roles'
import Schedule          from './Schedule'
import WeeklyAvailability from './WeeklyAvailability'
import Proposals         from './Proposals'
import Results           from './Results'
import './Scrims.css'

export default function Scrims() {
  const { profile }  = useAuth()
  const { t, lang }  = useI18n()
  const role         = profile?.role
  const hasAccess    = hasCalendarAccess(role)
  const [tab, setTab] = useState('schedule')

  const TABS = [
    { id: 'schedule',  label: t.scrims.tab_schedule  },
    { id: 'weekly',    label: t.scrims.tab_weekly    },
    { id: 'proposals', label: t.scrims.tab_proposals },
    { id: 'results',   label: t.scrims.tab_results   },
  ]

  return (
    <div className="page container">
      <div className="scrims-hero">
        <div className="scrims-hero-left">
          <p className="section-label">{t.scrims.label}</p>
          <h1 className="section-title">{t.scrims.title}</h1>
        </div>
        <div className="scrims-hero-right">
          <div className="scrims-user-chip">
            <span className="scrims-user-avatar">
              {profile?.display_name?.[0]?.toUpperCase() ?? '?'}
            </span>
            <div>
              <p className="scrims-user-name">{profile?.display_name}</p>
              <p className="scrims-user-role">{getRoleLabel(role, lang)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* No calendar access */}
      {!hasAccess ? (
        <div className="scrims-no-access">
          <div className="scrims-no-access-icon">🔒</div>
          <h2>{t.scrims.no_access_title}</h2>
          <p>{t.scrims.no_access_msg}</p>
        </div>
      ) : (
        <>
          <div className="scrims-tabs">
            {TABS.map(({ id, label }) => (
              <button
                key={id}
                className={`scrims-tab ${tab === id ? 'active' : ''}`}
                onClick={() => setTab(id)}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="scrims-content">
            {tab === 'schedule'  && <Schedule />}
            {tab === 'weekly'    && <WeeklyAvailability />}
            {tab === 'proposals' && <Proposals />}
            {tab === 'results'   && <Results />}
          </div>
        </>
      )}
    </div>
  )
}
