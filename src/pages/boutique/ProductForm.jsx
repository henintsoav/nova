import { useState, useRef } from 'react'
import Button from '../../components/ui/Button'

export const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Unique']

export const CAT_OPTIONS = [
  { id: 'tshirt',     label: 'T-shirt et polos' },
  { id: 'maillot',    label: 'Maillots' },
  { id: 'jogging',    label: 'Jogging' },
  { id: 'pull',       label: 'Pulls et hoodies' },
  { id: 'veste',      label: 'Veste et manteaux' },
  { id: 'short',      label: 'Short' },
  { id: 'accessoire', label: 'Accessoires' },
]

export function computePromo(original, percent) {
  const p = parseFloat(original)
  const d = parseInt(percent)
  if (!p || !d || d <= 0 || d >= 100) return null
  return (p * (1 - d / 100)).toFixed(2)
}

export const EMPTY_FORM = {
  name: '', category: 'tshirt', original_price: '',
  is_promo: false, promo_percent: '',
  sizes: [], in_stock: true,
  description: '', composition: '', care: '',
}

export default function ProductForm({ initial, onSave, saving, saveError }) {
  const [form, setForm]               = useState(initial.form)
  const [existingImages, setExisting] = useState(initial.images ?? [])
  const [newFiles, setNewFiles]       = useState([])
  const [previews, setPreviews]       = useState([])
  const [localError, setLocalError]   = useState(null)
  const inputRef = useRef(null)

  const totalImgs = existingImages.length + newFiles.length
  const computed  = computePromo(form.original_price, form.promo_percent)

  function f(field, value) { setForm(prev => ({ ...prev, [field]: value })) }

  function toggleSize(size) {
    setForm(prev => ({
      ...prev,
      sizes: prev.sizes.includes(size)
        ? prev.sizes.filter(s => s !== size)
        : [...prev.sizes, size],
    }))
  }

  function handleFiles(e) {
    const files = Array.from(e.target.files ?? [])
    if (totalImgs + files.length > 4) { setLocalError('Maximum 4 photos par produit.'); return }
    setLocalError(null)
    setNewFiles(prev => [...prev, ...files])
    setPreviews(prev => [...prev, ...files.map(f => URL.createObjectURL(f))])
  }

  function removeExisting(i) { setExisting(prev => prev.filter((_, idx) => idx !== i)) }
  function removeNew(i) {
    setNewFiles(p => p.filter((_, idx) => idx !== i))
    setPreviews(p => p.filter((_, idx) => idx !== i))
  }

  return (
    <form className="product-form" onSubmit={e => { e.preventDefault(); onSave({ form, existingImages, newFiles }) }}>

      <div className="form-group">
        <label className="form-label">Nom du produit *</label>
        <input className="form-input" required value={form.name}
          onChange={e => f('name', e.target.value)} placeholder="Ex: Maillot AXWELD 2025" />
      </div>

      <div className="product-form-row">
        <div className="form-group">
          <label className="form-label">Catégorie *</label>
          <select className="form-input" value={form.category} onChange={e => f('category', e.target.value)}>
            {CAT_OPTIONS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Prix original (€) *</label>
          <input className="form-input" type="number" min="0" step="0.01" required
            value={form.original_price} onChange={e => f('original_price', e.target.value)} placeholder="29.99" />
        </div>
      </div>

      <div className="form-group">
        <label className="form-check">
          <input type="checkbox" checked={form.is_promo} onChange={e => f('is_promo', e.target.checked)} />
          En promotion
        </label>
      </div>

      {form.is_promo && (
        <>
          <div className="form-group">
            <label className="form-label">Réduction (%)</label>
            <input className="form-input" type="number" min="1" max="99"
              value={form.promo_percent} onChange={e => f('promo_percent', e.target.value)} placeholder="Ex: 20" />
          </div>
          {computed && form.original_price && (
            <div className="promo-computed">
              Prix après promotion : <strong>{computed} €</strong>
              {' '}(au lieu de {parseFloat(form.original_price).toFixed(2)} €)
            </div>
          )}
        </>
      )}

      <div className="form-group">
        <label className="form-label">Tailles disponibles</label>
        <div className="size-checkboxes">
          {SIZES.map(s => (
            <label key={s} className={`size-checkbox-label ${form.sizes.includes(s) ? 'active' : ''}`}>
              <input type="checkbox" checked={form.sizes.includes(s)} onChange={() => toggleSize(s)}
                style={{ display: 'none' }} />
              {s}
            </label>
          ))}
        </div>
        <p className="form-hint">Laisser vide si aucune taille applicable (ex : accessoires)</p>
      </div>

      <div className="form-group">
        <label className="form-check" style={{ color: !form.in_stock ? '#ef4444' : undefined }}>
          <input type="checkbox" checked={!form.in_stock} onChange={e => f('in_stock', !e.target.checked)} />
          Rupture de stock
        </label>
      </div>

      <div className="form-group">
        <label className="form-label">Photos du modèle (max 4)</label>
        <div className="img-upload-zone">
          {existingImages.map((url, i) => (
            <div key={`ex-${i}`} className="img-thumb-wrap">
              <img src={url} alt="" className="img-thumb" />
              <button type="button" className="img-thumb-remove" onClick={() => removeExisting(i)}>✕</button>
            </div>
          ))}
          {previews.map((url, i) => (
            <div key={`new-${i}`} className="img-thumb-wrap">
              <img src={url} alt="" className="img-thumb" />
              <button type="button" className="img-thumb-remove" onClick={() => removeNew(i)}>✕</button>
            </div>
          ))}
          {totalImgs < 4 && (
            <button type="button" className="img-add-btn" onClick={() => inputRef.current?.click()}>+</button>
          )}
        </div>
        <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp"
          multiple style={{ display: 'none' }} onChange={handleFiles} />
        {localError && <p className="form-error" style={{ marginTop: 6 }}>{localError}</p>}
      </div>

      <div className="form-group">
        <label className="form-label">Description</label>
        <textarea className="form-input form-textarea" rows={3} value={form.description}
          onChange={e => f('description', e.target.value)} placeholder="Décrivez le produit…" />
      </div>

      <div className="form-group">
        <label className="form-label">Composition</label>
        <textarea className="form-input form-textarea" rows={2} value={form.composition}
          onChange={e => f('composition', e.target.value)} placeholder="Ex: 100% Polyester recyclé" />
      </div>

      <div className="form-group">
        <label className="form-label">Entretien</label>
        <textarea className="form-input form-textarea" rows={2} value={form.care}
          onChange={e => f('care', e.target.value)} placeholder="Ex: Lavage à 30°C, ne pas sécher en machine" />
      </div>

      {saveError && <p className="form-error">{saveError}</p>}
      <Button type="submit" loading={saving}>Enregistrer</Button>
    </form>
  )
}
