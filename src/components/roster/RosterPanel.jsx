import { useState, useEffect, useCallback } from 'react'
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

  const [members, setMembers]       = useState([])
  const [loading, setLoading]       = useState(true)
  const [addOpen, setAddOpen]       = useState(false)
  const [allProfiles, setAllProfiles] = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [position, setPosition]     = useState('')
  const [saving, setSaving]         = useState(false)

  const canManage = canManageRoster(profile?.role, game)

  const fetchMembers = useCallback(async () => {
    const { data } = await supabase
      .from('roster_members')
      .select('id, position, profiles(id, pseudo, display_name, accent_color, availability_status, banner_url)')
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
    setAddOpen(true)
  }

  async function handleAdd(e) {
    e.preventDefault()
    if (!selectedId) return
    setSaving(true)
    await supabase.from('roster_members').insert({
      game,
      profile_id: selectedId,
      position: position.trim() || null,
    })
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
            const p        = m.profiles
            const name     = displayName(p)
            const posLabel = m.position ? (roleLabels?.[m.position] ?? m.position) : null
            const cardColor = p?.accent_color ?? color
            const statusDot = { available: '#10B981', busy: '#F59E0B', vacation: '#EF4444' }
            const statusDotColor = statusDot[p?.availability_status ?? 'available']
            return (
              <Card key={m.id} className="roster-card" glow>
                <div className="roster-avatar-wrap">
                  <div
                    className="roster-avatar"
                    style={{ background: cardColor, borderColor: `${cardColor}66` }}
                  >
                    {p?.banner_url
                      ? <img src={p.banner_url} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                      : name[0]?.toUpperCase() ?? '?'
                    }
                  </div>
                  <span
                    className="roster-status-dot"
                    style={{ background: statusDotColor }}
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
                <option key={p.id} value={p.id}>
                  {displayName(p)}
                </option>
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
          <Button type="submit" loading={saving} style={{ marginTop: 8 }}>
            {t.roster.add_confirm}
          </Button>
        </form>
      </Modal>
    </>
  )
}
