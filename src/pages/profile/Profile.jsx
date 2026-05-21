import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useI18n } from '../../contexts/I18nContext'
import { getRoleLabel } from '../../lib/roles'
import { supabase } from '../../lib/supabase'
import Button from '../../components/ui/Button'
import './Profile.css'

export default function Profile() {
  const { user, profile, refreshProfile } = useAuth()
  const { t, lang } = useI18n()

  const [pseudo, setPseudo] = useState(profile?.pseudo ?? '')
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState(null) // 'saved' | 'error'

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setFeedback(null)

    const { error } = await supabase
      .from('profiles')
      .update({ pseudo: pseudo.trim() || null })
      .eq('user_id', user.id)

    if (error) {
      setFeedback('error')
    } else {
      await refreshProfile()
      setFeedback('saved')
    }
    setSaving(false)
    setTimeout(() => setFeedback(null), 3000)
  }

  return (
    <div className="page container">
      <p className="section-label">{t.profile.label}</p>
      <h1 className="section-title">{t.profile.title}</h1>
      <div className="divider" />

      <div className="profile-card">
        <form onSubmit={handleSave} className="profile-form">
          <div className="form-group">
            <label className="form-label">{t.profile.email_label}</label>
            <input className="form-input" value={user?.email ?? ''} disabled readOnly />
          </div>

          <div className="form-group">
            <label className="form-label">{t.profile.role_label}</label>
            <input
              className="form-input"
              value={getRoleLabel(profile?.role, lang)}
              disabled
              readOnly
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="pseudo">{t.profile.pseudo_label}</label>
            <input
              id="pseudo"
              className="form-input"
              placeholder={t.profile.pseudo_ph}
              value={pseudo}
              onChange={(e) => setPseudo(e.target.value)}
              maxLength={32}
            />
          </div>

          <div className="profile-actions">
            <Button type="submit" loading={saving}>
              {t.profile.save}
            </Button>
            {feedback === 'saved' && (
              <span className="profile-feedback success">{t.profile.saved}</span>
            )}
            {feedback === 'error' && (
              <span className="profile-feedback error">{t.profile.save_error}</span>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
