import { useState } from 'react'
import emailjs from '@emailjs/browser'
import { useI18n } from '../../contexts/I18nContext'
import { supabase, supabaseReady } from '../../lib/supabase'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import './JoinModal.css'

const EMAILJS_SERVICE  = import.meta.env.VITE_EMAILJS_SERVICE_ID
const EMAILJS_TEMPLATE = import.meta.env.VITE_EMAILJS_TEMPLATE_ID
const EMAILJS_KEY      = import.meta.env.VITE_EMAILJS_PUBLIC_KEY

const EMPTY = { prenom: '', nom: '', discord: '', section: '', game: '', role: '', message: '' }

export default function JoinModal({ open, onClose }) {
  const { t } = useI18n()
  const [form, setForm]         = useState(EMPTY)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess]   = useState(false)

  function field(key) {
    return (e) => setForm(f => ({ ...f, [key]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)

    const payload = {
      nom:     form.nom.trim(),
      prenom:  form.prenom.trim(),
      discord: form.discord.trim(),
      section: form.section,
      game:    form.section === 'esport' ? form.game    : null,
      role:    form.section === 'esport' ? form.role    : null,
      message: form.message.trim() || null,
    }

    // Store in Supabase (always attempted)
    if (supabaseReady) {
      await supabase.from('join_requests').insert(payload)
    }

    // Send email notification via EmailJS (optional — only if env vars are set)
    if (EMAILJS_SERVICE && EMAILJS_TEMPLATE && EMAILJS_KEY) {
      try {
        await emailjs.send(
          EMAILJS_SERVICE,
          EMAILJS_TEMPLATE,
          {
            prenom:  payload.prenom,
            nom:     payload.nom,
            discord: payload.discord,
            section: payload.section,
            game:    payload.game    ?? '—',
            role:    payload.role    ?? '—',
            message: payload.message ?? '—',
          },
          EMAILJS_KEY,
        )
      } catch (_) {
        // Email failed but data is saved in Supabase — silent fail
      }
    }

    setSubmitting(false)
    setSuccess(true)
  }

  function handleClose() {
    setSuccess(false)
    setForm(EMPTY)
    onClose()
  }

  return (
    <Modal open={open} onClose={handleClose} title={t.join.modal_title}>
      {success ? (
        <div className="join-success">
          <p className="join-success-msg">{t.join.success}</p>
          <Button size="sm" onClick={handleClose}>{t.join.close}</Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="join-form">

          <div className="join-row">
            <div className="form-group">
              <label className="form-label" htmlFor="j-prenom">{t.join.f_prenom}</label>
              <input id="j-prenom" className="form-input" value={form.prenom} onChange={field('prenom')} required />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="j-nom">{t.join.f_nom}</label>
              <input id="j-nom" className="form-input" value={form.nom} onChange={field('nom')} required />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="j-discord">{t.join.f_discord}</label>
            <input
              id="j-discord"
              className="form-input"
              value={form.discord}
              onChange={field('discord')}
              placeholder="username ou lien"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="j-section">{t.join.f_section}</label>
            <select id="j-section" className="form-input" value={form.section} onChange={field('section')} required>
              <option value="">—</option>
              <option value="esport">{t.join.s_esport}</option>
              <option value="audiovisuel">{t.join.s_audio}</option>
              <option value="evenementiel">{t.join.s_event}</option>
            </select>
          </div>

          {form.section === 'esport' && (
            <div className="join-row">
              <div className="form-group">
                <label className="form-label" htmlFor="j-game">{t.join.f_game}</label>
                <select id="j-game" className="form-input" value={form.game} onChange={field('game')} required>
                  <option value="">—</option>
                  <option value="lol">League of Legends</option>
                  <option value="wildrift">Wild Rift</option>
                  <option value="valorant">Valorant</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="j-role">{t.join.f_role}</label>
                <select id="j-role" className="form-input" value={form.role} onChange={field('role')} required>
                  <option value="">—</option>
                  <option value="joueur">{t.join.r_joueur}</option>
                  <option value="coach">{t.join.r_coach}</option>
                  <option value="manager">{t.join.r_manager}</option>
                </select>
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="form-label" htmlFor="j-message">{t.join.f_message}</label>
            <textarea
              id="j-message"
              className="form-input join-textarea"
              value={form.message}
              onChange={field('message')}
              rows={4}
              placeholder={t.join.f_message_ph}
            />
          </div>

          <Button type="submit" loading={submitting}>{t.join.submit}</Button>
        </form>
      )}
    </Modal>
  )
}
