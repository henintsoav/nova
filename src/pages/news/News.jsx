import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useI18n } from '../../contexts/I18nContext'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import './News.css'

const EMPTY_FORM = { title: '', content: '', category: 'annonce' }

const CATEGORY_COLORS = {
  annonce:     { bg: 'rgba(124,58,237,0.15)', color: '#a78bfa' },
  match:       { bg: 'rgba(16,185,129,0.15)', color: '#34d399' },
  recrutement: { bg: 'rgba(245,158,11,0.15)', color: '#fbbf24' },
}

export default function News() {
  const { profile } = useAuth()
  const { t }       = useI18n()
  const canManage   = profile?.role === 'founder' || profile?.role === 'staff'

  const [posts,    setPosts]    = useState([])
  const [loading,  setLoading]  = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [form,     setForm]     = useState(EMPTY_FORM)
  const [editId,   setEditId]   = useState(null)
  const [saving,   setSaving]   = useState(false)

  useEffect(() => { fetchPosts() }, [])

  async function fetchPosts() {
    setLoading(true)
    const query = supabase
      .from('news_posts')
      .select('*')
      .order('created_at', { ascending: false })

    const { data } = canManage ? await query : await query.eq('published', true)
    setPosts(data ?? [])
    setLoading(false)
  }

  function openCreate() {
    setForm(EMPTY_FORM)
    setEditId(null)
    setFormOpen(true)
  }

  function openEdit(post) {
    setForm({ title: post.title, content: post.content, category: post.category })
    setEditId(post.id)
    setFormOpen(true)
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    if (editId) {
      await supabase.from('news_posts').update({ ...form, updated_at: new Date().toISOString() }).eq('id', editId)
    } else {
      await supabase.from('news_posts').insert(form)
    }
    setSaving(false)
    setFormOpen(false)
    fetchPosts()
  }

  async function handleDelete(id) {
    if (!confirm(t.news.delete_confirm)) return
    await supabase.from('news_posts').delete().eq('id', id)
    fetchPosts()
  }

  const catLabel = (c) => t.news[`cat_${c}`] ?? c
  const catStyle = (c) => CATEGORY_COLORS[c] ?? CATEGORY_COLORS.annonce

  return (
    <div className="page container">
      <p className="section-label">{t.news.label}</p>
      <h1 className="section-title">{t.news.title}</h1>
      <div className="divider" />

      {canManage && (
        <div className="news-toolbar">
          <Button size="sm" onClick={openCreate}>{t.news.add}</Button>
        </div>
      )}

      {loading ? (
        <p className="scrims-loading">{t.common.loading}</p>
      ) : posts.length === 0 ? (
        <Card className="scrims-empty"><p>{t.news.empty}</p></Card>
      ) : (
        <div className="news-grid">
          {posts.map((post) => {
            const style = catStyle(post.category)
            return (
              <Card key={post.id} className="news-card" glow>
                <div className="news-card-header">
                  <span
                    className="badge"
                    style={{ background: style.bg, color: style.color }}
                  >
                    {catLabel(post.category)}
                  </span>
                  <span className="news-date">
                    {new Date(post.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </div>
                <h3 className="news-title">{post.title}</h3>
                <p className="news-content">{post.content}</p>
                {canManage && (
                  <div className="news-actions">
                    <button className="scrim-action-btn" onClick={() => openEdit(post)}>{t.news.edit}</button>
                    <button className="scrim-action-btn danger" onClick={() => handleDelete(post.id)}>{t.news.delete}</button>
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editId ? t.news.modal_edit : t.news.modal_new}>
        <form className="scrim-form" onSubmit={handleSave}>
          <div className="form-group">
            <label className="form-label">{t.news.f_category}</label>
            <select className="form-input" value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}>
              <option value="annonce">{t.news.cat_annonce}</option>
              <option value="match">{t.news.cat_match}</option>
              <option value="recrutement">{t.news.cat_recrutement}</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">{t.news.f_title}</label>
            <input className="form-input" required value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">{t.news.f_content}</label>
            <textarea className="form-input form-textarea" required rows={6} value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })} />
          </div>
          <Button type="submit" loading={saving} className="form-submit">
            {editId ? t.news.save : t.news.create}
          </Button>
        </form>
      </Modal>
    </div>
  )
}
