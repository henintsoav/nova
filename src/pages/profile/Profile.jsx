import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useI18n } from '../../contexts/I18nContext'
import { getRoleLabel } from '../../lib/roles'
import { supabase } from '../../lib/supabase'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import './Profile.css'

export default function Profile() {
  const { user, profile, refreshProfile, deleteAccount } = useAuth()
  const { t, lang } = useI18n()

  // ── Pseudo update ────────────────────────────────────────────
  const [pseudo, setPseudo]   = useState(profile?.pseudo ?? '')
  const [saving, setSaving]   = useState(false)
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

  // ── Delete account ───────────────────────────────────────────
  const [deleteOpen, setDeleteOpen]   = useState(false)
  const [confirmWord, setConfirmWord] = useState('')
  const [deleting, setDeleting]       = useState(false)
  const [deleteError, setDeleteError] = useState(null)

  const REQUIRED_WORD = t.profile.delete_confirm_word

  async function handleDelete(e) {
    e.preventDefault()
    if (confirmWord !== REQUIRED_WORD) return
    setDeleting(true)
    setDeleteError(null)
    const { error } = await deleteAccount()
    if (error) {
      setDeleteError(t.profile.delete_error)
      setDeleting(false)
    }
    // On success: AuthContext calls signOut → user is redirected by ProtectedRoute
  }

  function closeDeleteModal() {
    setDeleteOpen(false)
    setConfirmWord('')
    setDeleteError(null)
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

        {/* ── Danger zone ── */}
        <div className="profile-danger-zone">
          <div className="danger-zone-divider" />
          <Button
            variant="ghost"
            size="sm"
            className="danger-btn"
            onClick={() => setDeleteOpen(true)}
          >
            {t.profile.delete_btn}
          </Button>
        </div>
      </div>

      {/* ── Delete confirmation modal ── */}
      <Modal open={deleteOpen} onClose={closeDeleteModal} title={t.profile.delete_title}>
        <form onSubmit={handleDelete} className="delete-form">
          <p className="delete-warning">{t.profile.delete_warning}</p>

          <div className="form-group">
            <label className="form-label">{t.profile.delete_confirm_label}</label>
            <input
              className="form-input"
              value={confirmWord}
              onChange={(e) => setConfirmWord(e.target.value)}
              placeholder={t.profile.delete_confirm_ph}
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
            />
          </div>

          {deleteError && <p className="form-error">{deleteError}</p>}

          <div className="delete-actions">
            <Button
              type="submit"
              loading={deleting}
              disabled={confirmWord !== REQUIRED_WORD}
              className="delete-confirm-btn"
            >
              {t.profile.delete_confirm_btn}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={closeDeleteModal}>
              {t.profile.delete_cancel}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
