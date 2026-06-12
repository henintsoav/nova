import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useI18n } from '../../contexts/I18nContext'
import { getAccessibleGames, isCoachOrStaff } from '../../lib/roles'
import { postScrimScheduled } from '../../lib/discord'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'

const GAME_LABELS = { lol: 'LoL', wildrift: 'Wild Rift', valorant: 'Valorant' }

const STATUS_BADGE = {
  scheduled: 'badge-accent',
  confirmed:  'badge-success',
  completed:  'badge-primary',
  cancelled:  'badge-danger',
}

const EMPTY_FORM = {
  title: '', game: 'lol', date: '', time: '',
  opponent: '', format: 'bo1', notes: '', status: 'scheduled',
}

export default function Schedule() {
  const { user, profile } = useAuth()
  const { t }             = useI18n()
  const role              = profile?.role
  const isAdmin           = isCoachOrStaff(role)
  const accessibleGames   = getAccessibleGames(role)

  const [scrims, setScrims]     = useState([])
  const [loading, setLoading]   = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm]         = useState({ ...EMPTY_FORM, game: accessibleGames[0] ?? 'lol' })
  const [saving, setSaving]     = useState(false)
  const [editId, setEditId]     = useState(null)

  useEffect(() => { fetchScrims() }, [accessibleGames.join(',')])

  async function fetchScrims() {
    setLoading(true)
    let query = supabase.from('scrims').select('*').order('date', { ascending: true }).order('time', { ascending: true })

    // Filter by accessible games (unless staff who sees all)
    if (accessibleGames.length > 0 && accessibleGames.length < 3) {
      query = query.in('game', accessibleGames)
    }

    const { data } = await query
    setScrims(data ?? [])
    setLoading(false)
  }

  function openCreate() {
    setForm({ ...EMPTY_FORM, game: accessibleGames[0] ?? 'lol' })
    setEditId(null)
    setFormOpen(true)
  }

  function openEdit(scrim) {
    setForm({
      title: scrim.title, game: scrim.game, date: scrim.date,
      time: scrim.time.slice(0, 5), opponent: scrim.opponent ?? '',
      format: scrim.format, notes: scrim.notes ?? '', status: scrim.status,
    })
    setEditId(scrim.id)
    setFormOpen(true)
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    const payload = { ...form, created_by: user.id }
    if (editId) {
      await supabase.from('scrims').update(payload).eq('id', editId)
    } else {
      await supabase.from('scrims').insert(payload)
      await postScrimScheduled(form)
    }
    setSaving(false)
    setFormOpen(false)
    fetchScrims()
  }

  async function handleDelete(id) {
    if (!confirm(t.schedule.delete_confirm)) return
    await supabase.from('scrims').delete().eq('id', id)
    fetchScrims()
  }

  const statusLabel = (s) => t.schedule[`status_${s}`] ?? s

  if (loading) return <p className="scrims-loading">{t.common.loading}</p>

  return (
    <div>
      <div className="scrims-toolbar">
        <h2 className="scrims-section-title">{t.schedule.title}</h2>
        {isAdmin && (
          <Button size="sm" onClick={openCreate}>{t.schedule.add}</Button>
        )}
      </div>

      {scrims.length === 0 ? (
        <Card className="scrims-empty">
          <p>{t.schedule.empty}</p>
          {isAdmin && <Button size="sm" onClick={openCreate}>{t.schedule.add_first}</Button>}
        </Card>
      ) : (
        <div className="scrim-list">
          {scrims.map((scrim) => (
            <Card key={scrim.id} className="scrim-row" glow>
              <div className="scrim-row-date">
                <span className="scrim-day">{new Date(scrim.date).toLocaleDateString('fr-FR', { day: '2-digit' })}</span>
                <span className="scrim-month">{new Date(scrim.date).toLocaleDateString('fr-FR', { month: 'short' })}</span>
              </div>
              <div className="scrim-row-info">
                <div className="scrim-row-header">
                  <span className="scrim-title">{scrim.title}</span>
                  <div className="scrim-badges">
                    <span className="badge badge-primary">{GAME_LABELS[scrim.game]}</span>
                    <span className="badge badge-primary">{scrim.format.toUpperCase()}</span>
                    <span className={`badge ${STATUS_BADGE[scrim.status]}`}>{statusLabel(scrim.status)}</span>
                  </div>
                </div>
                <div className="scrim-meta">
                  <span>🕐 {scrim.time?.slice(0, 5)}</span>
                  {scrim.opponent && <span>{t.schedule.vs} {scrim.opponent}</span>}
                  {scrim.notes && <span className="scrim-notes">{scrim.notes}</span>}
                </div>
              </div>
              {isAdmin && (
                <div className="scrim-actions">
                  <button className="scrim-action-btn" onClick={() => openEdit(scrim)}>{t.schedule.edit}</button>
                  <button className="scrim-action-btn danger" onClick={() => handleDelete(scrim.id)}>{t.schedule.delete}</button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editId ? t.schedule.modal_edit : t.schedule.modal_new}>
        <form className="scrim-form" onSubmit={handleSave}>
          <div className="form-group">
            <label className="form-label">{t.schedule.f_title}</label>
            <input className="form-input" required value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div className="scrim-form-row">
            <div className="form-group">
              <label className="form-label">{t.schedule.f_game}</label>
              <select className="form-input" value={form.game}
                onChange={(e) => setForm({ ...form, game: e.target.value })}>
                {accessibleGames.map((g) => (
                  <option key={g} value={g}>{GAME_LABELS[g]}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">{t.schedule.f_format}</label>
              <select className="form-input" value={form.format}
                onChange={(e) => setForm({ ...form, format: e.target.value })}>
                <option value="bo1">Bo1</option>
                <option value="bo3">Bo3</option>
                <option value="bo5">Bo5</option>
              </select>
            </div>
          </div>
          <div className="scrim-form-row">
            <div className="form-group">
              <label className="form-label">{t.schedule.f_date}</label>
              <input className="form-input" type="date" required value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">{t.schedule.f_time}</label>
              <input className="form-input" type="time" required value={form.time}
                onChange={(e) => setForm({ ...form, time: e.target.value })} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">{t.schedule.f_opponent}</label>
            <input className="form-input" value={form.opponent}
              onChange={(e) => setForm({ ...form, opponent: e.target.value })}
              placeholder={t.schedule.f_opponent_ph} />
          </div>
          <div className="form-group">
            <label className="form-label">{t.schedule.f_status}</label>
            <select className="form-input" value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="scheduled">{t.schedule.status_scheduled}</option>
              <option value="confirmed">{t.schedule.status_confirmed}</option>
              <option value="completed">{t.schedule.status_completed}</option>
              <option value="cancelled">{t.schedule.status_cancelled}</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">{t.schedule.f_notes}</label>
            <textarea className="form-input form-textarea" value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} />
          </div>
          <Button type="submit" loading={saving} className="form-submit">
            {editId ? t.schedule.save : t.schedule.create}
          </Button>
        </form>
      </Modal>
    </div>
  )
}
