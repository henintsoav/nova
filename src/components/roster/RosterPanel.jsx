import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useI18n } from '../../contexts/I18nContext'
import { canManageRoster } from '../../lib/roles'
import { supabase } from '../../lib/supabase'
import Card from '../ui/Card'
import Modal from '../ui/Modal'
import Button from '../ui/Button'

export default function RosterPanel({ game, color, roleLabels }) {
  const { profile } = useAuth()
  const { t } = useI18n()

  const [members, setMembers]         = useState([])
  const [loading, setLoading]         = useState(true)
  const [addOpen, setAddOpen]         = useState(false)
  const [allProfiles, setAllProfiles] = useState([])
  const [selectedId, setSelectedId]   = useState('')
  const [position, setPosition]       = useState('')
  const [photoFile, setPhotoFile]     = useState(null)
  const [photoPreview, setPreview]    = useState(null)
  const [saving, setSaving]           = useState(false)
  const [saveError, setSaveError]     = useState(null)
  const fileRef = useRef(null)

  const canManage = canManageRoster(profile?.role, game)

  const fetchMembers = useCallback(async () => {
    const { data } = await supabase
      .from('roster_members')
      .select('id, position, photo_url, profiles(id, pseudo, display_name, accent_color, availability_status, banner_url)')
      .eq('game', game)
      .order('created_at')
    setMembers(data ?? [])
    setLoading(false)
  }, [game])

  useEffect(() => { fetchMembers() }, [fetchMembers])

  async function openAddModal() {
    const { data } = await supabase
      .from('profiles')
      .select('id, pseudo, display_name')
      .order('pseudo')
    setAllProfiles(data ?? [])
    setSelectedId('')
    setPosition('')
    setPhotoFile(null)
    setPreview(null)
    setSaveError(null)
    setAddOpen(true)
  }

  function handlePhotoChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 3 * 1024 * 1024) { setSaveError('Photo trop lourde (max 3 Mo).'); return }
    setSaveError(null)
    setPhotoFile(file)
    setPreview(URL.createObjectURL(file))
  }

  async function uploadPhoto(memberId, file) {
    const ext  = file.name.split('.').pop() ?? 'jpg'
    const path = `${game}/${memberId}.${ext}`
    const { error } = await supabase.storage
      .from('rosters')
      .upload(path, file, { upsert: true, contentType: file.type })
    if (error) throw new Error(`Upload photo : ${error.message}`)
    const { data: { publicUrl } } = supabase.storage.from('rosters').getPublicUrl(path)
    return `${publicUrl}?t=${Date.now()}`
  }

  async function handleAdd(e) {
    e.preventDefault()
    if (!selectedId) return
    setSaving(true)
    setSaveError(null)

    const { data: member, error } = await supabase
      .from('roster_members')
      .insert({ game, profile_id: selectedId, position: position.trim() || null })
      .select('id')
      .single()

    if (error) { setSaveError(error.message); setSaving(false); return }

    if (photoFile) {
      try {
        const url = await uploadPhoto(member.id, photoFile)
        await supabase.from('roster_members').update({ photo_url: url }).eq('id', member.id)
      } catch (err) {
        setSaveError(err.message)
      }
    }

    setSaving(false)
    setAddOpen(false)
    fetchMembers()
  }

  async function handleRemove(memberId) {
    await supabase.from('roster_members').delete().eq('id', memberId)
    fetchMembers()
  }

  function displayName(p) {
    return p?.pseudo || p?.display_name || '?'
  }

  if (loading) return <p className="text-muted">{t.common.loading}</p>

  return (
    <>
      {canManage && (
        <div className="roster-toolbar">
          <Button size="sm" onClick={openAddModal}>{t.roster.add}</Button>
        </div>
      )}

      {members.length === 0 ? (
        <p className="roster-empty">{t.roster.empty}</p>
      ) : (
        <div className="roster-grid">
          {members.map((m) => {
            const p         = m.profiles
            const name      = displayName(p)
            const posLabel  = m.position ? (roleLabels?.[m.position] ?? m.position) : null
            const cardColor = p?.accent_color ?? color
            const photoUrl  = m.photo_url || p?.banner_url
            const statusDot = { available: '#10B981', busy: '#F59E0B', vacation: '#EF4444' }
            const dotColor  = statusDot[p?.availability_status ?? 'available']
            return (
              <Card key={m.id} className="roster-card" glow>
                <div className="roster-avatar-wrap">
                  <div
                    className="roster-avatar"
                    style={{ background: cardColor, borderColor: `${cardColor}66` }}
                  >
                    {photoUrl
                      ? <img src={photoUrl} alt={name} className="roster-avatar-img" />
                      : name[0]?.toUpperCase() ?? '?'
                    }
                  </div>
                  <span
                    className="roster-status-dot"
                    style={{ background: dotColor }}
                    title={p?.availability_status ?? 'available'}
                  />
                </div>
                <span className="roster-name">{name}</span>
                {posLabel && <span className="roster-role">{posLabel}</span>}
                {canManage && (
                  <button
                    className="roster-remove-btn"
                    onClick={() => handleRemove(m.id)}
                    aria-label={t.roster.remove}
                  >
                    {t.roster.remove}
                  </button>
                )}
              </Card>
            )
          })}
        </div>
      )}

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title={t.roster.modal_title}>
        <form onSubmit={handleAdd}>
          <div className="form-group">
            <label className="form-label">{t.roster.select_player}</label>
            <select
              className="form-input"
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              required
            >
              <option value="">—</option>
              {allProfiles.map((p) => (
                <option key={p.id} value={p.id}>{displayName(p)}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">{t.roster.position}</label>
            <select
              className="form-input"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
            >
              <option value="">—</option>
              {Object.keys(roleLabels ?? {}).map((key) => (
                <option key={key} value={key}>{roleLabels[key]}</option>
              ))}
            </select>
          </div>

          {/* Photo du joueur */}
          <div className="form-group">
            <label className="form-label">Photo du joueur (facultatif)</label>
            <div className="roster-photo-upload">
              {photoPreview ? (
                <img src={photoPreview} alt="preview" className="roster-photo-preview" />
              ) : (
                <div className="roster-photo-placeholder">👤</div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <Button type="button" size="sm" variant="ghost" onClick={() => fileRef.current?.click()}>
                  {photoPreview ? 'Changer la photo' : 'Ajouter une photo'}
                </Button>
                <span style={{ fontSize: '0.73rem', color: 'var(--text-faint)' }}>PNG, JPG · max 3 Mo</span>
              </div>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handlePhotoChange}
            />
          </div>

          {saveError && <p className="form-error">{saveError}</p>}

          <Button type="submit" loading={saving} style={{ marginTop: 8 }}>
            {t.roster.add_confirm}
          </Button>
        </form>
      </Modal>
    </>
  )
}
