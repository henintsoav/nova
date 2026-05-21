import { useState } from 'react'
import { useI18n } from '../../contexts/I18nContext'
import { useAuth } from '../../contexts/AuthContext'
import { canManageContent } from '../../lib/roles'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import './Event.css'

const TYPE_KEY = { tournament: 'type_tournament', scrim: 'type_scrim', session: 'type_session' }
const STATUS_BADGE = { upcoming: 'badge-accent', past: 'badge-primary' }
const EMPTY_FORM = { title: '', desc: '', date: '', time: '', location: '', game: '', type: 'tournament', status: 'upcoming' }

export default function Event() {
  const { t } = useI18n()
  const { profile } = useAuth()
  const canManage = canManageContent(profile?.role)

  const [events, setEvents] = useState([])
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)

  const upcoming = events.filter((e) => e.status === 'upcoming')
  const past     = events.filter((e) => e.status === 'past')

  function openAdd() {
    setForm(EMPTY_FORM)
    setModal({ mode: 'add' })
  }

  function openEdit(idx) {
    setForm({ ...events[idx] })
    setModal({ mode: 'edit', index: idx })
  }

  function closeModal() { setModal(null) }

  function handleSave(e) {
    e.preventDefault()
    if (modal.mode === 'add') {
      setEvents((prev) => [...prev, form])
    } else {
      setEvents((prev) => prev.map((ev, i) => i === modal.index ? form : ev))
    }
    closeModal()
  }

  function handleDelete(idx) {
    if (!confirm(t.event.delete_confirm)) return
    setEvents((prev) => prev.filter((_, i) => i !== idx))
  }

  function field(key, value) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  const isAdd = modal?.mode === 'add'

  return (
    <div className="page container">
      <p className="section-label">{t.event.label}</p>
      <h1 className="section-title">{t.event.title}</h1>
      <div className="divider" />

      {canManage && (
        <div className="content-actions">
          <Button size="sm" onClick={openAdd}>{t.event.add}</Button>
        </div>
      )}

      {events.length === 0 ? (
        <div className="empty-state">
          <p className="empty-state-title">{t.event.empty_title}</p>
          <p className="empty-state-sub">{t.event.empty_sub}</p>
        </div>
      ) : (
        <>
          {upcoming.length > 0 && (
            <section className="event-section">
              <h2 className="event-section-heading">{t.event.upcoming}</h2>
              <div className="event-list">
                {upcoming.map((ev) => {
                  const idx = events.indexOf(ev)
                  return (
                    <EventCard
                      key={idx}
                      event={ev}
                      t={t}
                      canManage={canManage}
                      onEdit={() => openEdit(idx)}
                      onDelete={() => handleDelete(idx)}
                    />
                  )
                })}
              </div>
            </section>
          )}

          {past.length > 0 && (
            <section className="event-section">
              <h2 className="event-section-heading">{t.event.past}</h2>
              <div className="event-list">
                {past.map((ev) => {
                  const idx = events.indexOf(ev)
                  return (
                    <EventCard
                      key={idx}
                      event={ev}
                      t={t}
                      past
                      canManage={canManage}
                      onEdit={() => openEdit(idx)}
                      onDelete={() => handleDelete(idx)}
                    />
                  )
                })}
              </div>
            </section>
          )}
        </>
      )}

      <Modal open={!!modal} onClose={closeModal} title={isAdd ? t.event.modal_new : t.event.modal_edit}>
        <form className="scrim-form" onSubmit={handleSave}>
          <div className="form-group">
            <label className="form-label">{t.event.f_title}</label>
            <input className="form-input" required value={form.title}
              onChange={(e) => field('title', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">{t.event.f_desc}</label>
            <textarea className="form-input form-textarea" value={form.desc}
              onChange={(e) => field('desc', e.target.value)} rows={2} />
          </div>
          <div className="scrim-form-row">
            <div className="form-group">
              <label className="form-label">{t.event.f_date}</label>
              <input className="form-input" type="date" required value={form.date}
                onChange={(e) => field('date', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">{t.event.f_time}</label>
              <input className="form-input" type="time" value={form.time}
                onChange={(e) => field('time', e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">{t.event.f_location}</label>
            <input className="form-input" value={form.location}
              onChange={(e) => field('location', e.target.value)} />
          </div>
          <div className="scrim-form-row">
            <div className="form-group">
              <label className="form-label">{t.event.f_game}</label>
              <input className="form-input" value={form.game}
                onChange={(e) => field('game', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">{t.event.f_type}</label>
              <select className="form-input" value={form.type}
                onChange={(e) => field('type', e.target.value)}>
                <option value="tournament">{t.event.type_tournament}</option>
                <option value="scrim">{t.event.type_scrim}</option>
                <option value="session">{t.event.type_session}</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">{t.event.f_status}</label>
              <select className="form-input" value={form.status}
                onChange={(e) => field('status', e.target.value)}>
                <option value="upcoming">{t.event.upcoming_badge}</option>
                <option value="past">{t.event.past_badge}</option>
              </select>
            </div>
          </div>
          <Button type="submit" className="form-submit">
            {isAdd ? t.event.create : t.event.save}
          </Button>
        </form>
      </Modal>
    </div>
  )
}

function EventCard({ event, t, past = false, canManage, onEdit, onDelete }) {
  const dateObj     = new Date(event.date)
  const day         = dateObj.toLocaleDateString('fr-FR', { day: '2-digit' })
  const month       = dateObj.toLocaleDateString('fr-FR', { month: 'short' })
  const statusLabel = past ? t.event.past_badge : t.event.upcoming_badge
  const typeLabel   = t.event[TYPE_KEY[event.type]] ?? event.type

  return (
    <Card className={`event-card ${past ? 'event-card-past' : ''}`} glow={!past}>
      <div className="event-date-block">
        <span className="event-day">{day}</span>
        <span className="event-month">{month}</span>
      </div>
      <div className="event-info">
        <div className="event-badges">
          <span className={`badge ${STATUS_BADGE[event.status]}`}>{statusLabel}</span>
          <span className="badge badge-primary">{typeLabel}</span>
          <span className="badge badge-primary">{event.game}</span>
        </div>
        <h3 className="event-title">{event.title}</h3>
        <p className="event-desc">{event.desc}</p>
        <div className="event-meta">
          <span>🕐 {event.time}</span>
          <span>📍 {event.location}</span>
        </div>
      </div>
      {canManage && (
        <div className="scrim-actions">
          <button className="scrim-action-btn" onClick={onEdit}>{t.event.edit}</button>
          <button className="scrim-action-btn danger" onClick={onDelete}>{t.event.delete}</button>
        </div>
      )}
    </Card>
  )
}
