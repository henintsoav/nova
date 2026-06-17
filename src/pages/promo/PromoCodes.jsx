import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { isFounder } from '../../lib/roles'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import './PromoCodes.css'

const EMPTY_FORM = {
  code: '', discount_type: 'percent', discount_value: '',
  min_order: '', max_uses: '', expires_at: '',
}

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export default function PromoCodes() {
  const { user, profile } = useAuth()
  const founder = isFounder(profile?.role)

  const [codes, setCodes]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm]         = useState({ ...EMPTY_FORM })
  const [saving, setSaving]     = useState(false)
  const [saveError, setSaveError] = useState(null)

  useEffect(() => { if (founder) fetchCodes() }, [founder])

  async function fetchCodes() {
    setLoading(true)
    const { data } = await supabase
      .from('promo_codes')
      .select('*')
      .order('created_at', { ascending: false })
    setCodes(data ?? [])
    setLoading(false)
  }

  function f(field, value) { setForm(prev => ({ ...prev, [field]: value })) }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setSaveError(null)

    const code = form.code.trim().toUpperCase()
    if (!code) { setSaveError('Le code est requis.'); setSaving(false); return }

    const payload = {
      code,
      discount_type:  form.discount_type,
      discount_value: parseFloat(form.discount_value) || 0,
      min_order:      form.min_order    ? parseFloat(form.min_order)  : null,
      max_uses:       form.max_uses     ? parseInt(form.max_uses)     : null,
      expires_at:     form.expires_at   ? new Date(form.expires_at).toISOString() : null,
      created_by:     user.id,
    }

    const { error } = await supabase.from('promo_codes').insert(payload)
    if (error) { setSaveError(error.message); setSaving(false); return }

    await fetchCodes()
    setSaving(false)
    setFormOpen(false)
    setForm({ ...EMPTY_FORM })
  }

  async function toggleActive(code) {
    await supabase
      .from('promo_codes')
      .update({ active: !code.active })
      .eq('id', code.id)
    setCodes(prev => prev.map(c => c.id === code.id ? { ...c, active: !c.active } : c))
  }

  async function handleDelete(code) {
    if (!confirm(`Supprimer le code "${code.code}" ?`)) return
    await supabase.from('promo_codes').delete().eq('id', code.id)
    setCodes(prev => prev.filter(c => c.id !== code.id))
  }

  if (!founder) return (
    <div className="page container">
      <p style={{ color: 'var(--text-faint)', marginTop: 40 }}>Accès non autorisé.</p>
    </div>
  )

  return (
    <div className="page container">
      <p className="section-label">Administration</p>
      <h1 className="section-title">Codes de promotion</h1>
      <div className="divider" />

      <div className="promo-admin-toolbar">
        <span style={{ fontSize: '0.85rem', color: 'var(--text-faint)' }}>
          {codes.length} code{codes.length !== 1 ? 's' : ''}
        </span>
        <Button size="sm" onClick={() => { setForm({ ...EMPTY_FORM }); setSaveError(null); setFormOpen(true) }}>
          + Nouveau code
        </Button>
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-faint)' }}>Chargement…</p>
      ) : codes.length === 0 ? (
        <p className="promo-empty">Aucun code de promotion créé.</p>
      ) : (
        <div className="promo-table-wrap">
          <table className="promo-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Réduction</th>
                <th>Min. commande</th>
                <th>Utilisations</th>
                <th>Expiration</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {codes.map(code => {
                const usesLabel = code.max_uses != null
                  ? `${code.uses_count} / ${code.max_uses}`
                  : `${code.uses_count} / ∞`
                const expired = code.expires_at && new Date(code.expires_at) < new Date()

                return (
                  <tr key={code.id}>
                    <td><span className="promo-code-chip">{code.code}</span></td>
                    <td>
                      <span className={`promo-type-badge ${code.discount_type}`}>
                        {code.discount_type === 'percent'
                          ? `−${code.discount_value}%`
                          : `−${parseFloat(code.discount_value).toFixed(2)} €`}
                      </span>
                    </td>
                    <td>{code.min_order != null ? `${parseFloat(code.min_order).toFixed(2)} €` : '—'}</td>
                    <td>{usesLabel}</td>
                    <td style={{ color: expired ? '#ef4444' : undefined }}>{formatDate(code.expires_at)}</td>
                    <td>
                      <span className={`promo-status-dot ${code.active && !expired ? 'active' : 'inactive'}`} />
                      {code.active && !expired ? 'Actif' : expired ? 'Expiré' : 'Inactif'}
                    </td>
                    <td>
                      <div className="promo-table-actions">
                        <button
                          className={`promo-toggle-btn ${code.active ? 'deactivate' : 'activate'}`}
                          onClick={() => toggleActive(code)}
                        >
                          {code.active ? 'Désactiver' : 'Activer'}
                        </button>
                        <button className="promo-delete-btn" onClick={() => handleDelete(code)}>
                          Supprimer
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title="Nouveau code de promotion">
        <form className="promo-form" onSubmit={handleSave}>
          <div className="promo-form-row">
            <div className="form-group">
              <label className="form-label">Code *</label>
              <input className="form-input" required value={form.code}
                onChange={e => f('code', e.target.value.toUpperCase())}
                placeholder="EX: AXWELD20"
                style={{ textTransform: 'uppercase', letterSpacing: '0.08em' }} />
            </div>
            <div className="form-group">
              <label className="form-label">Type de réduction *</label>
              <select className="form-input" value={form.discount_type}
                onChange={e => f('discount_type', e.target.value)}>
                <option value="percent">Pourcentage (%)</option>
                <option value="fixed">Montant fixe (€)</option>
              </select>
            </div>
          </div>

          <div className="promo-form-3col">
            <div className="form-group">
              <label className="form-label">
                Valeur * {form.discount_type === 'percent' ? '(%)' : '(€)'}
              </label>
              <input className="form-input" type="number" required min="0.01" step="0.01"
                value={form.discount_value} onChange={e => f('discount_value', e.target.value)}
                placeholder={form.discount_type === 'percent' ? 'Ex: 20' : 'Ex: 5.00'} />
            </div>
            <div className="form-group">
              <label className="form-label">Commande minimum (€)</label>
              <input className="form-input" type="number" min="0" step="0.01"
                value={form.min_order} onChange={e => f('min_order', e.target.value)}
                placeholder="Facultatif" />
            </div>
            <div className="form-group">
              <label className="form-label">Nombre max d'utilisations</label>
              <input className="form-input" type="number" min="1" step="1"
                value={form.max_uses} onChange={e => f('max_uses', e.target.value)}
                placeholder="Illimité" />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Date d'expiration</label>
            <input className="form-input" type="date"
              value={form.expires_at} onChange={e => f('expires_at', e.target.value)} />
          </div>

          {saveError && <p className="form-error">{saveError}</p>}
          <Button type="submit" loading={saving}>Créer le code</Button>
        </form>
      </Modal>
    </div>
  )
}
