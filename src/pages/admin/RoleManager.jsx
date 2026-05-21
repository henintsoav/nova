import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useI18n } from '../../contexts/I18nContext'
import { ROLES, getRoleLabel } from '../../lib/roles'
import Card from '../../components/ui/Card'
import './RoleManager.css'

export default function RoleManager() {
  const { t, lang } = useI18n()
  const [profiles, setProfiles] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [feedback, setFeedback] = useState({}) // { [id]: 'saved' | 'error' }

  useEffect(() => { fetchProfiles() }, [])

  async function fetchProfiles() {
    setLoading(true)
    const { data } = await supabase
      .from('profiles')
      .select('id, user_id, display_name, username, role')
      .order('role')
      .order('display_name')
    setProfiles(data ?? [])
    setLoading(false)
  }

  async function handleRoleChange(profileId, newRole) {
    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', profileId)

    setFeedback((prev) => ({ ...prev, [profileId]: error ? 'error' : 'saved' }))
    if (!error) {
      setProfiles((prev) =>
        prev.map((p) => p.id === profileId ? { ...p, role: newRole } : p)
      )
      setTimeout(() => setFeedback((prev) => ({ ...prev, [profileId]: null })), 2000)
    }
  }

  return (
    <div className="page container">
      <p className="section-label">{t.admin.label}</p>
      <h1 className="section-title">{t.admin.title}</h1>
      <div className="divider" />

      {loading ? (
        <p className="scrims-loading">{t.admin.loading}</p>
      ) : profiles.length === 0 ? (
        <p className="scrims-loading">{t.admin.empty}</p>
      ) : (
        <Card>
          <table className="schedule-table admin-table">
            <thead>
              <tr>
                <th>{t.admin.user}</th>
                <th>{t.admin.role}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {profiles.map((p) => (
                <tr key={p.id}>
                  <td>
                    <span className="admin-display-name">{p.display_name || p.username || '—'}</span>
                  </td>
                  <td>
                    <select
                      className="form-input admin-role-select"
                      value={p.role}
                      onChange={(e) => handleRoleChange(p.id, e.target.value)}
                    >
                      {ROLES.map((r) => (
                        <option key={r.value} value={r.value}>
                          {lang === 'fr' ? r.labelFr : r.labelEn}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="admin-feedback-cell">
                    {feedback[p.id] === 'saved' && (
                      <span className="admin-feedback admin-feedback-ok">✓</span>
                    )}
                    {feedback[p.id] === 'error' && (
                      <span className="admin-feedback admin-feedback-err">✕</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  )
}
