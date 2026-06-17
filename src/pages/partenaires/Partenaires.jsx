import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { isFounder } from '../../lib/roles'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import './Partenaires.css'

const EMPTY_FORM = { name: '', description: '', website_url: '', display_order: '0' }

// ── Partner card ─────────────────────────────────────────────────────────────

function PartnerCard({ partner, founder, onEdit, onDelete }) {
  return (
    <div className="partner-card">
      <div className="partner-logo-wrap">
        {partner.logo_url
          ? <img src={partner.logo_url} alt={partner.name} className="partner-logo" />
          : <span className="partner-logo-placeholder">🤝</span>
        }
      </div>

      <p className="partner-name">{partner.name}</p>

      {partner.description && (
        <p className="partner-description">{partner.description}</p>
      )}

      <div className="partner-card-footer">
        {partner.website_url && (
          <a
            href={partner.website_url}
            target="_blank"
            rel="noopener noreferrer"
            className="partner-discover-btn"
          >
            Découvrir →
          </a>
        )}
        {founder && (
          <div className="partner-founder-btns">
            <button className="partner-icon-btn" title="Modifier" onClick={() => onEdit(partner)}>✏️</button>
            <button className="partner-icon-btn delete" title="Supprimer" onClick={() => onDelete(partner)}>🗑</button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Partner form ─────────────────────────────────────────────────────────────

function PartnerForm({ initial, onSave, saving, saveError }) {
  const [form, setForm]         = useState(initial.form)
  const [logoFile, setLogoFile] = useState(null)
  const [logoPreview, setPreview] = useState(initial.logoUrl ?? null)
  const [localError, setLocalError] = useState(null)
  const inputRef = useRef(null)

  function f(field, value) { setForm(p => ({ ...p, [field]: value })) }

  function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { setLocalError('Logo trop lourd (max 2 Mo).'); return }
    setLocalError(null)
    setLogoFile(file)
    setPreview(URL.createObjectURL(file))
  }

  return (
    <form className="partner-form" onSubmit={e => { e.preventDefault(); onSave({ form, logoFile, existingLogoUrl: initial.logoUrl }) }}>
      <div className="form-group">
        <label className="form-label">Nom du partenaire *</label>
        <input className="form-input" required value={form.name}
          onChange={e => f('name', e.target.value)} placeholder="Ex: Sponsor Corp" />
      </div>

      <div className="form-group">
        <label className="form-label">Logo</label>
        <div className="partner-logo-upload">
          <div className="partner-logo-preview">
            {logoPreview
              ? <img src={logoPreview} alt="logo" />
              : <span>🖼</span>
            }
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Button type="button" size="sm" variant="ghost" onClick={() => inputRef.current?.click()}>
              {logoPreview ? 'Changer le logo' : 'Ajouter un logo'}
            </Button>
            <span style={{ fontSize: '0.74rem', color: 'var(--text-faint)' }}>PNG, JPG ou SVG · max 2 Mo</span>
          </div>
        </div>
        <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />
        {localError && <p className="form-error" style={{ marginTop: 6 }}>{localError}</p>}
      </div>

      <div className="form-group">
        <label className="form-label">Description</label>
        <textarea className="form-input form-textarea" rows={3} value={form.description}
          onChange={e => f('description', e.target.value)}
          placeholder="Quelques mots sur ce partenaire…" />
      </div>

      <div className="form-group">
        <label className="form-label">Lien vers leur site (facultatif)</label>
        <input className="form-input" type="url" value={form.website_url}
          onChange={e => f('website_url', e.target.value)}
          placeholder="https://exemple.com" />
      </div>

      <div className="form-group">
        <label className="form-label">Ordre d'affichage</label>
        <input className="form-input" type="number" min="0" value={form.display_order}
          onChange={e => f('display_order', e.target.value)} />
      </div>

      {saveError && <p className="form-error">{saveError}</p>}
      <Button type="submit" loading={saving}>Enregistrer</Button>
    </form>
  )
}

// ── Page principale ───────────────────────────────────────────────────────────

export default function Partenaires() {
  const { user, profile } = useAuth()
  const founder = isFounder(profile?.role)

  const [partners, setPartners]   = useState([])
  const [loading, setLoading]     = useState(true)

  const [formOpen, setFormOpen]   = useState(false)
  const [editPartner, setEdit]    = useState(null)
  const [formInitial, setInitial] = useState(null)
  const [saving, setSaving]       = useState(false)
  const [saveError, setSaveError] = useState(null)

  useEffect(() => { fetchPartners() }, [])

  async function fetchPartners() {
    setLoading(true)
    const { data } = await supabase
      .from('partners')
      .select('*')
      .order('display_order', { ascending: true })
      .order('created_at',    { ascending: true })
    setPartners(data ?? [])
    setLoading(false)
  }

  function openAdd() {
    setEdit(null)
    setInitial({ form: { ...EMPTY_FORM }, logoUrl: null })
    setSaveError(null)
    setFormOpen(true)
  }

  function openEdit(partner) {
    setEdit(partner)
    setInitial({
      form: {
        name:          partner.name,
        description:   partner.description ?? '',
        website_url:   partner.website_url ?? '',
        display_order: String(partner.display_order ?? 0),
      },
      logoUrl: partner.logo_url ?? null,
    })
    setSaveError(null)
    setFormOpen(true)
  }

  async function uploadLogo(partnerId, file) {
    const ext  = file.name.split('.').pop() ?? 'png'
    const path = `${partnerId}/logo.${ext}`
    const { error } = await supabase.storage
      .from('partners')
      .upload(path, file, { upsert: true, contentType: file.type })
    if (error) throw new Error(`Upload logo échoué : ${error.message}`)
    const { data: { publicUrl } } = supabase.storage.from('partners').getPublicUrl(path)
    return `${publicUrl}?t=${Date.now()}`
  }

  async function handleSave({ form, logoFile, existingLogoUrl }) {
    setSaving(true)
    setSaveError(null)

    const payload = {
      name:          form.name.trim(),
      description:   form.description.trim() || null,
      website_url:   form.website_url.trim() || null,
      display_order: parseInt(form.display_order) || 0,
    }

    let partnerId

    if (editPartner) {
      const { error } = await supabase.from('partners').update(payload).eq('id', editPartner.id)
      if (error) { setSaveError(error.message); setSaving(false); return }
      partnerId = editPartner.id
    } else {
      const { data, error } = await supabase
        .from('partners')
        .insert({ ...payload, created_by: user.id })
        .select('id').single()
      if (error) { setSaveError(error.message); setSaving(false); return }
      partnerId = data.id
    }

    let logoUrl = existingLogoUrl
    if (logoFile) {
      try {
        logoUrl = await uploadLogo(partnerId, logoFile)
      } catch (err) {
        setSaveError(err.message)
        setSaving(false)
        return
      }
    }

    if (logoUrl !== existingLogoUrl) {
      await supabase.from('partners').update({ logo_url: logoUrl }).eq('id', partnerId)
    }

    await fetchPartners()
    setSaving(false)
    setFormOpen(false)
  }

  async function handleDelete(partner) {
    if (!confirm(`Supprimer le partenaire "${partner.name}" ?`)) return
    await supabase.from('partners').delete().eq('id', partner.id)
    setPartners(prev => prev.filter(p => p.id !== partner.id))
  }

  return (
    <div className="page container">
      <p className="section-label">AXWELD</p>
      <h1 className="section-title">Partenaires</h1>
      <div className="divider" />

      {/* ── Texte hero ── */}
      <div className="partenaires-hero">
        <h2 className="partenaires-hero-title">Devenez partenaire AXWELD</h2>

        <div className="partenaires-hero-body">
          <p>
            Devenir partenaire d'AXWELD, c'est soutenir une association e-sport et audiovisuelle nantaise
            en plein développement et s'associer à un projet structuré, ambitieux et ancré dans la scène
            compétitive française.
          </p>
          <p>
            C'est aider nos joueurs à performer en LAN lors de tournois régionaux et nationaux. C'est aussi
            soutenir la création de contenus audiovisuels et numériques portés par des passionnés, de la
            production vidéo à la culture gaming.
          </p>
          <p>
            Nous aider, c'est également contribuer à l'organisation d'événements ouverts à tous — tournois
            grand public, LANs, animations et rencontres communautaires — pensés pour faire découvrir
            l'e-sport et fédérer bien au-delà de nos équipes.
          </p>
          <p>
            Enfin, c'est contribuer à la croissance d'une communauté soudée, portée par des valeurs de
            respect, de dépassement de soi et de fair-play.
          </p>
          <p>
            En échange, nous vous offrons une visibilité sur nos jerseys, notre site web, nos réseaux
            sociaux et lors de nos événements, auprès d'une audience jeune et engagée. Chaque partenariat
            est formalisé par convention et construit sur mesure.
          </p>
          <p><strong style={{ color: 'var(--text)' }}>Intéressé(e) ? Contactez-nous.</strong></p>
        </div>

        <a href="mailto:contact@axweld.fr" className="partenaires-cta">
          Nous rejoindre →
        </a>
      </div>

      {/* ── Section partenaires ── */}
      <div className="partenaires-section">
        <div className="partenaires-section-header">
          <h2 className="partenaires-section-title">Nos partenaires</h2>
          {founder && (
            <Button size="sm" onClick={openAdd}>+ Ajouter un partenaire</Button>
          )}
        </div>

        {loading ? (
          <p style={{ color: 'var(--text-faint)' }}>Chargement…</p>
        ) : partners.length === 0 ? (
          <p className="partners-empty">Aucun partenaire pour le moment.</p>
        ) : (
          <div className="partners-grid">
            {partners.map(p => (
              <PartnerCard
                key={p.id}
                partner={p}
                founder={founder}
                onEdit={openEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editPartner ? 'Modifier le partenaire' : 'Nouveau partenaire'}
      >
        {formInitial && (
          <PartnerForm
            key={editPartner?.id ?? 'new'}
            initial={formInitial}
            onSave={handleSave}
            saving={saving}
            saveError={saveError}
          />
        )}
      </Modal>
    </div>
  )
}
