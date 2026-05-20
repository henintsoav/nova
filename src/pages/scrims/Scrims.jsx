import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useI18n } from '../../contexts/I18nContext'
import Schedule from './Schedule'
import Availability from './Availability'
import './Scrims.css'

export default function Scrims() {
  const { profile, isAdmin } = useAuth()
  const { t }                = useI18n()
  const [tab, setTab]        = useState('schedule')

  const TABS = [
    { id: 'schedule',     label: t.scrims.tab_schedule },
    { id: 'availability', label: t.scrims.tab_availability },
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
              <p className="scrims-user-role">{isAdmin ? t.scrims.role_admin : t.scrims.role_member}</p>
            </div>
          </div>
        </div>
      </div>

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
        {tab === 'schedule'     && <Schedule />}
        {tab === 'availability' && <Availability />}
      </div>
    </div>
  )
}
