import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import Card from '../../components/ui/Card'

const STATUS_OPTIONS = [
  { value: 'available',   label: 'Available',   color: 'var(--success)' },
  { value: 'maybe',       label: 'Maybe',        color: 'var(--gold)' },
  { value: 'unavailable', label: 'Unavailable',  color: 'var(--danger)' },
]

const GAME_LABELS = { lol: 'LoL', wildrift: 'Wild Rift', valorant: 'Valorant' }

export default function Availability() {
  const { user, isAdmin } = useAuth()
  const [scrims, setScrims]         = useState([])
  const [availability, setAvail]    = useState({}) // { scrimId: 'available' | 'maybe' | 'unavailable' }
  const [allAvail, setAllAvail]     = useState([]) // admin: all rows
  const [profiles, setProfiles]     = useState({}) // userId -> display_name
  const [loading, setLoading]       = useState(true)
  const [saving, setSaving]         = useState(null)

  useEffect(() => { init() }, [])

  async function init() {
    setLoading(true)
    await Promise.all([fetchScrims(), fetchMyAvailability()])
    if (isAdmin) await Promise.all([fetchAllAvailability(), fetchProfiles()])
    setLoading(false)
  }

  async function fetchScrims() {
    const { data } = await supabase
      .from('scrims')
      .select('*')
      .in('status', ['scheduled', 'confirmed'])
      .order('date', { ascending: true })
    setScrims(data ?? [])
  }

  async function fetchMyAvailability() {
    const { data } = await supabase
      .from('availability')
      .select('scrim_id, status')
      .eq('user_id', user.id)
    const map = {}
    for (const row of data ?? []) map[row.scrim_id] = row.status
    setAvail(map)
  }

  async function fetchAllAvailability() {
    const { data } = await supabase.from('availability').select('*')
    setAllAvail(data ?? [])
  }

  async function fetchProfiles() {
    const { data } = await supabase.from('profiles').select('user_id, display_name')
    const map = {}
    for (const p of data ?? []) map[p.user_id] = p.display_name
    setProfiles(map)
  }

  async function setStatus(scrimId, status) {
    setSaving(scrimId)
    await supabase
      .from('availability')
      .upsert({ user_id: user.id, scrim_id: scrimId, status }, { onConflict: 'user_id,scrim_id' })
    setAvail((prev) => ({ ...prev, [scrimId]: status }))
    if (isAdmin) await fetchAllAvailability()
    setSaving(null)
  }

  function countForScrim(scrimId, status) {
    return allAvail.filter((a) => a.scrim_id === scrimId && a.status === status).length
  }

  if (loading) return <p className="scrims-loading">Loading…</p>

  return (
    <div>
      <h2 className="scrims-section-title">My Availability</h2>
      {scrims.length === 0 ? (
        <Card className="scrims-empty"><p>No upcoming scrims.</p></Card>
      ) : (
        <div className="avail-list">
          {scrims.map((scrim) => {
            const current = availability[scrim.id] ?? null
            return (
              <Card key={scrim.id} className="avail-card">
                <div className="avail-card-info">
                  <div className="avail-card-header">
                    <span className="avail-scrim-title">{scrim.title}</span>
                    <span className="badge badge-primary">{GAME_LABELS[scrim.game]}</span>
                  </div>
                  <div className="avail-scrim-meta">
                    <span>{new Date(scrim.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                    <span>🕐 {scrim.time?.slice(0, 5)}</span>
                    {scrim.opponent && <span>vs {scrim.opponent}</span>}
                  </div>

                  {/* Admin: show counts */}
                  {isAdmin && (
                    <div className="avail-counts">
                      {STATUS_OPTIONS.map(({ value, label, color }) => (
                        <span key={value} style={{ color, fontSize: '0.75rem', fontWeight: 600 }}>
                          {countForScrim(scrim.id, value)} {label}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="avail-buttons">
                  {STATUS_OPTIONS.map(({ value, label, color }) => (
                    <button
                      key={value}
                      className={`avail-btn ${current === value ? 'active' : ''}`}
                      style={current === value ? { borderColor: color, color, background: `${color}18` } : {}}
                      onClick={() => setStatus(scrim.id, value)}
                      disabled={saving === scrim.id}
                    >
                      <span className={`status-dot ${value}`} />
                      {label}
                    </button>
                  ))}
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
