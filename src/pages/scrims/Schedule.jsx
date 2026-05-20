import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
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
  const { isAdmin, user } = useAuth()
  const [scrims, setScrims]     = useState([])
  const [loading, setLoading]   = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm]         = useState(EMPTY_FORM)
  const [saving, setSaving]     = useState(false)
  const [editId, setEditId]     = useState(null)

  useEffect(() => { fetchScrims() }, [])

  async function fetchScrims() {
    setLoading(true)
    const { data } = await supabase
      .from('scrims')
      .select('*')
      .order('date', { ascending: true })
      .order('time', { ascending: true })
    setScrims(data ?? [])
    setLoading(false)
  }

  function openCreate() {
    setForm(EMPTY_FORM)
    setEditId(null)
    setFormOpen(true)
  }

  function openEdit(scrim) {
    setForm({
      title: scrim.title,
      game: scrim.game,
      date: scrim.date,
      time: scrim.time.slice(0, 5),
      opponent: scrim.opponent ?? '',
      format: scrim.format,
      notes: scrim.notes ?? '',
      status: scrim.status,
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
    }

    setSaving(false)
    setFormOpen(false)
    fetchScrims()
  }

  async function handleDelete(id) {
    if (!confirm('Delete this scrim?')) return
    await supabase.from('scrims').delete().eq('id', id)
    fetchScrims()
  }

  if (loading) return <p className="scrims-loading">Loading…</p>

  return (
    <div>
      <div className="scrims-toolbar">
        <h2 className="scrims-section-title">Schedule</h2>
        {isAdmin && (
          <Button size="sm" onClick={openCreate}>+ Add scrim</Button>
        )}
      </div>

      {scrims.length === 0 ? (
        <Card className="scrims-empty">
          <p>No scrims scheduled yet.</p>
          {isAdmin && <Button size="sm" onClick={openCreate}>Add the first one</Button>}
        </Card>
      ) : (
        <div className="scrim-list">
          {scrims.map((scrim) => (
            <Card key={scrim.id} className="scrim-row" glow>
              <div className="scrim-row-date">
                <span className="scrim-day">{new Date(scrim.date).toLocaleDateString('en-US', { day: '2-digit' })}</span>
                <span className="scrim-month">{new Date(scrim.date).toLocaleDateString('en-US', { month: 'short' })}</span>
              </div>
              <div className="scrim-row-info">
                <div className="scrim-row-header">
                  <span className="scrim-title">{scrim.title}</span>
                  <div className="scrim-badges">
                    <span className="badge badge-primary">{GAME_LABELS[scrim.game]}</span>
                    <span className="badge badge-primary">{scrim.format.toUpperCase()}</span>
                    <span className={`badge ${STATUS_BADGE[scrim.status]}`}>{scrim.status}</span>
                  </div>
                </div>
                <div className="scrim-meta">
                  <span>🕐 {scrim.time?.slice(0, 5)}</span>
                  {scrim.opponent && <span>vs {scrim.opponent}</span>}
                  {scrim.notes && <span className="scrim-notes">{scrim.notes}</span>}
                </div>
              </div>
              {isAdmin && (
                <div className="scrim-actions">
                  <button className="scrim-action-btn" onClick={() => openEdit(scrim)}>Edit</button>
                  <button className="scrim-action-btn danger" onClick={() => handleDelete(scrim.id)}>Delete</button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Admin form modal */}
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editId ? 'Edit Scrim' : 'New Scrim'}
      >
        <form className="scrim-form" onSubmit={handleSave}>
          <div className="form-group">
            <label className="form-label">Title</label>
            <input className="form-input" required value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div className="scrim-form-row">
            <div className="form-group">
              <label className="form-label">Game</label>
              <select className="form-input" value={form.game}
                onChange={(e) => setForm({ ...form, game: e.target.value })}>
                <option value="lol">League of Legends</option>
                <option value="wildrift">Wild Rift</option>
                <option value="valorant">Valorant</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Format</label>
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
              <label className="form-label">Date</label>
              <input className="form-input" type="date" required value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Time</label>
              <input className="form-input" type="time" required value={form.time}
                onChange={(e) => setForm({ ...form, time: e.target.value })} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Opponent</label>
            <input className="form-input" value={form.opponent}
              onChange={(e) => setForm({ ...form, opponent: e.target.value })} placeholder="Team name" />
          </div>
          <div className="form-group">
            <label className="form-label">Status</label>
            <select className="form-input" value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="scheduled">Scheduled</option>
              <option value="confirmed">Confirmed</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Notes</label>
            <textarea className="form-input form-textarea" value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} />
          </div>
          <Button type="submit" loading={saving} className="form-submit">
            {editId ? 'Save changes' : 'Create scrim'}
          </Button>
        </form>
      </Modal>
    </div>
  )
}
