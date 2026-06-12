import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useI18n } from '../../contexts/I18nContext'
import { getRoleLabel } from '../../lib/roles'
import { supabase } from '../../lib/supabase'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import './Profile.css'

const ACCENT_COLORS = [
  { value: '#7C3AED', label: 'Violet'  },
  { value: '#3B82F6', label: 'Bleu'    },
  { value: '#06B6D4', label: 'Cyan'    },
  { value: '#10B981', label: 'Vert'    },
  { value: '#F59E0B', label: 'Orange'  },
  { value: '#EF4444', label: 'Rouge'   },
  { value: '#EC4899', label: 'Rose'    },
  { value: '#EAB308', label: 'Or'      },
]

export default function Profile() {
  const { user, profile, refreshProfile, deleteAccount } = useAuth()
  const { t, lang } = useI18n()

  // ── Pseudo + customization ───────────────────────────────────
  const [pseudo,      setPseudo]      = useState(profile?.pseudo ?? '')
  const [accentColor, setAccentColor] = useState(profile?.accent_color ?? '#7C3AED')
  const [status,      setStatus]      = useState(profile?.availability_status ?? 'vacation')
  const [saving,      setSaving]      = useState(false)
  const [feedback,    setFeedback]    = useState(null) // 'saved' | 'error'

  // ── Banner upload ─────────────────────────────────────────────
  const [bannerUrl,    setBannerUrl]    = useState(profile?.banner_url ?? null)
  const [bannerError,  setBannerError]  = useState(null)
  const [bannerSaving, setBannerSaving] = useState(false)
  const bannerInputRef = useRef(null)

  // Sync fields when profile loads or updates
  useEffect(() => {
    setPseudo(profile?.pseudo ?? '')
    setAccentColor(profile?.accent_color ?? '#7C3AED')
    setStatus(profile?.availability_status ?? 'vacation')
    setBannerUrl(profile?.banner_url ?? null)
  }, [profile])

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setFeedback(null)

    const { error } = await supabase
      .from('profiles')
      .update({
        pseudo:               pseudo.trim() || null,
        accent_color:         accentColor,
        availability_status:  status,
      })
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

  async function handleBannerUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setBannerError(null)

    if (file.size > 1024 * 1024) { setBannerError(t.profile.banner_error); return }
    if (!['image/jpeg', 'image/png'].includes(file.type)) { setBannerError(t.profile.banner_error); return }

    setBannerSaving(true)
    const ext  = file.type === 'image/png' ? 'png' : 'jpg'
    const path = `${user.id}/banner.${ext}`

    const { error: upErr } = await supabase.storage
      .from('banners')
      .upload(path, file, { upsert: true, contentType: file.type })

    if (upErr) { setBannerError(upErr.message); setBannerSaving(false); return }

    const { data: { publicUrl } } = supabase.storage.from('banners').getPublicUrl(path)
    const url = `${publicUrl}?t=${Date.now()}`

    await supabase.from('profiles').update({ banner_url: url }).eq('user_id', user.id)
    setBannerUrl(url)
    await refreshProfile()
    setBannerSaving(false)
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
        <form onSubmit={handleSave} className="profile-layout">

          {/* ── Colonne gauche ── */}
          <div className="profile-col-left">
            <div className="profile-form">
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
            </div>
          </div>

          {/* ── Colonne droite ── */}
          <div className="profile-col-right">

            {/* ── Photo de profil ── */}
            <div className="form-group">
              <label className="form-label">{t.profile.banner_label}</label>
              <div className="profile-avatar-wrap">
                <div className="profile-avatar-preview">
                  {bannerUrl
                    ? <img src={bannerUrl} alt="avatar" className="profile-avatar-img" />
                    : <span className="profile-avatar-initial">{(profile?.pseudo || profile?.display_name)?.[0]?.toUpperCase() ?? '?'}</span>
                  }
                </div>
                <span
                  className="profile-status-dot"
                  style={{ background: { available: '#10B981', busy: '#F59E0B', vacation: '#EF4444' }[status] ?? '#EF4444' }}
                  title={t.profile[`status_${status}`]}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
                <Button type="button" size="sm" variant="ghost" loading={bannerSaving}
                  onClick={() => bannerInputRef.current?.click()}>
                  {t.profile.banner_change}
                </Button>
                <span className="profile-banner-hint">{t.profile.banner_hint}</span>
              </div>
              <input ref={bannerInputRef} type="file" accept="image/jpeg,image/png"
                style={{ display: 'none' }} onChange={handleBannerUpload} />
              {bannerError && <p className="form-error" style={{ marginTop: 6 }}>{bannerError}</p>}
            </div>

            {/* ── Accent color ── */}
            <div className="form-group">
              <label className="form-label">{t.profile.accent_label}</label>
              <div className="profile-color-picker">
                {ACCENT_COLORS.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    className={`color-swatch ${accentColor === value ? 'active' : ''}`}
                    style={{ background: value }}
                    title={label}
                    onClick={() => setAccentColor(value)}
                  />
                ))}
              </div>
            </div>

            {/* ── Status ── */}
            <div className="form-group">
              <label className="form-label">{t.profile.status_label}</label>
              <select className="form-input" value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="available">{t.profile.status_available}</option>
                <option value="busy">{t.profile.status_busy}</option>
                <option value="vacation">{t.profile.status_vacation}</option>
              </select>
            </div>

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
