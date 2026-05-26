import { useState } from 'react'
import { useI18n } from '../../contexts/I18nContext'
import { useAuth } from '../../contexts/AuthContext'
import { canManageContent } from '../../lib/roles'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import './Visual.css'

const TAGS = ['All']
const EMPTY_FORM = { title: '', type: '' }

export default function Visual() {
  const { t } = useI18n()
  const { profile } = useAuth()
  const canManage = canManageContent(profile?.role)
  const [activeTag, setActiveTag] = useState('All')

  const [works, setWorks] = useState([])
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)

  const filtered = activeTag === 'All' ? works : works.filter((w) => w.type === activeTag)

  function openAdd() {
    setForm(EMPTY_FORM)
    setModal({ mode: 'add' })
  }

  function openEdit(work) {
    setForm({ title: work.title, type: work.type })
    setModal({ mode: 'edit', id: work.id })
  }

  function closeModal() { setModal(null) }

  function handleSave(e) {
    e.preventDefault()
    if (modal.mode === 'add') {
      const id   = works.length ? Math.max(...works.map((w) => w.id)) + 1 : 1
      const date = new Date().toISOString().slice(0, 7)
      setWorks((prev) => [...prev, { ...form, id, date }])
    } else {
      setWorks((prev) => prev.map((w) => w.id === modal.id ? { ...w, ...form } : w))
    }
    closeModal()
  }

  function handleDelete(id) {
    if (!confirm(t.visual.delete_confirm)) return
    setWorks((prev) => prev.filter((w) => w.id !== id))
  }

  function field(key, value) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  const isAdd = modal?.mode === 'add'

  return (
    <div className="page container">
      <p className="section-label">{t.visual.label}</p>
      <h1 className="section-title">{t.visual.title}</h1>
      <div className="divider" />
      {canManage && (
        <div className="content-actions">
          <Button size="sm" onClick={openAdd}>{t.visual.add}</Button>
        </div>
      )}

      <div className="visual-tags">
        {TAGS.map((tag) => (
          <button
            key={tag}
            className={`visual-tag ${activeTag === tag ? 'active' : ''}`}
            onClick={() => setActiveTag(tag)}
          >
            {tag === 'All' ? t.visual.all : tag}
          </button>
        ))}
      </div>

      {works.length === 0 || filtered.length === 0 ? (
        <div className="empty-state">
          <p className="empty-state-title">{t.visual.empty_title}</p>
          <p className="empty-state-sub">{t.visual.empty_sub}</p>
        </div>
      ) : (
        <div className="visual-grid">
          {filtered.map((work) => (
            <Card key={work.id} className="visual-card" glow>
              <div className="visual-card-preview">
                <span className="visual-card-type-icon">✦</span>
              </div>
              <div className="visual-card-info">
                <span className="badge badge-primary">{work.type}</span>
                <h3 className="visual-card-title">{work.title}</h3>
                <span className="visual-card-date">{work.date}</span>
                {canManage && (
                  <div className="visual-card-actions">
                    <button className="scrim-action-btn" onClick={() => openEdit(work)}>{t.visual.edit}</button>
                    <button className="scrim-action-btn danger" onClick={() => handleDelete(work.id)}>{t.visual.delete}</button>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={!!modal} onClose={closeModal} title={isAdd ? t.visual.modal_new : t.visual.modal_edit}>
        <form className="scrim-form" onSubmit={handleSave}>
          <div className="form-group">
            <label className="form-label">{t.visual.f_title}</label>
            <input className="form-input" required value={form.title}
              onChange={(e) => field('title', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">{t.visual.f_type}</label>
            <select className="form-input" value={form.type}
              onChange={(e) => field('type', e.target.value)}>
              {TAGS.filter((tag) => tag !== 'All').map((tag) => (
                <option key={tag} value={tag}>{tag}</option>
              ))}
            </select>
          </div>
          <Button type="submit" className="form-submit">
            {isAdd ? t.visual.create : t.visual.save}
          </Button>
        </form>
      </Modal>
    </div>
  )
}
