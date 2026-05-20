import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import Schedule from './Schedule'
import Availability from './Availability'
import './Scrims.css'

const TABS = [
  { id: 'schedule',     label: 'Schedule' },
  { id: 'availability', label: 'My Availability' },
]

export default function Scrims() {
  const { profile, isAdmin } = useAuth()
  const [tab, setTab] = useState('schedule')

  return (
    <div className="page container">
      <div className="scrims-hero">
        <div className="scrims-hero-left">
          <p className="section-label">Members Area</p>
          <h1 className="section-title">Scrims</h1>
        </div>
        <div className="scrims-hero-right">
          <div className="scrims-user-chip">
            <span className="scrims-user-avatar">
              {profile?.display_name?.[0]?.toUpperCase() ?? '?'}
            </span>
            <div>
              <p className="scrims-user-name">{profile?.display_name}</p>
              <p className="scrims-user-role">{isAdmin ? 'Admin' : 'Member'}</p>
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
