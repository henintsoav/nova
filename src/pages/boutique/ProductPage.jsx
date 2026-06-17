import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useCart } from '../../contexts/CartContext'
import { isFounder } from '../../lib/roles'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import './ProductPage.css'

const CAT_LABELS = {
  tshirt:     'T-shirt & polos',
  maillot:    'Maillots',
  jogging:    'Jogging',
  pull:       'Pulls & hoodies',
  veste:      'Veste & manteaux',
  short:      'Short',
  accessoire: 'Accessoires',
}

const CAT_OPTIONS = Object.entries(CAT_LABELS).map(([id, label]) => ({ id, label }))

const EMPTY_FORM = {
  name: '', category: 'tshirt', original_price: '',
  is_promo: false, promo_percent: '',
  description: '', composition: '', care: '',
}

function computePromo(original, percent) {
  const p = parseFloat(original)
  const d = parseInt(percent)
  if (!p || !d || d <= 0 || d >= 100) return null
  return (p * (1 - d / 100)).toFixed(2)
}

// ── Inline edit form (same as in Boutique.jsx) ───────────────────────────────

function ProductForm({ initial, onSave, saving, saveError }) {
  const [form, setForm]               = useState(initial.form)
  const [existingImages, setExisting] = useState(initial.images ?? [])
  const [newFiles, setNewFiles]       = useState([])
  const [previews, setPreviews]       = useState([])
  const [localError, setLocalError]   = useState(null)
  const inputRef = useRef(null)

  const totalImgs = existingImages.length + newFiles.length
  const computed  = computePromo(form.original_price, form.promo_percent)

  function f(field, value) { setForm(prev => ({ ...prev, [field]: value })) }

  function handleFiles(e) {
    const files = Array.from(e.target.files ?? [])
    if (totalImgs + files.length > 4) { setLocalError('Maximum 4 photos par produit.'); return }
    setLocalError(null)
    const urls = files.map(f => URL.createObjectURL(f))
    setNewFiles(prev => [...prev, ...files])
    setPreviews(prev => [...prev, ...urls])
  }

  function removeExisting(i) { setExisting(prev => prev.filter((_, idx) => idx !== i)) }
  function removeNew(i) { setNewFiles(p => p.filter((_,idx)=>idx!==i)); setPreviews(p=>p.filter((_,idx)=>idx!==i)) }

  function handleSubmit(e) {
    e.preventDefault()
    onSave({ form, existingImages, newFiles })
  }

  return (
    <form style={{ display: 'flex', flexDirection: 'column', gap: 16 }} onSubmit={handleSubmit}>
      <div className="form-group">
        <label className="form-label">Nom du produit *</label>
        <input className="form-input" required value={form.name} onChange={e => f('name', e.target.value)} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="form-group">
          <label className="form-label">Catégorie *</label>
          <select className="form-input" value={form.category} onChange={e => f('category', e.target.value)}>
            {CAT_OPTIONS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Prix original (€) *</label>
          <input className="form-input" type="number" min="0" step="0.01" required
            value={form.original_price} onChange={e => f('original_price', e.target.value)} />
        </div>
      </div>
      <div className="form-group">
        <label style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer', fontSize:'0.85rem', color:'var(--text-muted)' }}>
          <input type="checkbox" checked={form.is_promo} onChange={e => f('is_promo', e.target.checked)}
            style={{ width:16, height:16, accentColor:'var(--primary)' }} />
          En promotion
        </label>
      </div>
      {form.is_promo && (
        <>
          <div className="form-group">
            <label className="form-label">Réduction (%)</label>
            <input className="form-input" type="number" min="1" max="99"
              value={form.promo_percent} onChange={e => f('promo_percent', e.target.value)} />
          </div>
          {computed && form.original_price && (
            <div style={{ padding:'10px 14px', background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.25)', borderRadius:'var(--radius-sm)', fontSize:'0.85rem', color:'#ef4444', fontWeight:700 }}>
              Prix après promotion : <strong>{computed} €</strong> (au lieu de {parseFloat(form.original_price).toFixed(2)} €)
            </div>
          )}
        </>
      )}
      <div className="form-group">
        <label className="form-label">Photos (max 4)</label>
        <div style={{ display:'flex', flexWrap:'wrap', gap:10, marginTop:6 }}>
          {existingImages.map((url, i) => (
            <div key={`ex-${i}`} style={{ position:'relative', width:80, height:80, borderRadius:'var(--radius-sm)', overflow:'hidden', border:'1px solid var(--border)' }}>
              <img src={url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
              <button type="button" onClick={() => removeExisting(i)}
                style={{ position:'absolute', top:2, right:2, width:18, height:18, borderRadius:'50%', background:'rgba(239,68,68,0.85)', color:'#fff', fontSize:'0.6rem', display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
            </div>
          ))}
          {previews.map((url, i) => (
            <div key={`new-${i}`} style={{ position:'relative', width:80, height:80, borderRadius:'var(--radius-sm)', overflow:'hidden', border:'1px solid var(--border)' }}>
              <img src={url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
              <button type="button" onClick={() => removeNew(i)}
                style={{ position:'absolute', top:2, right:2, width:18, height:18, borderRadius:'50%', background:'rgba(239,68,68,0.85)', color:'#fff', fontSize:'0.6rem', display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
            </div>
          ))}
          {totalImgs < 4 && (
            <button type="button" onClick={() => inputRef.current?.click()}
              style={{ width:80, height:80, borderRadius:'var(--radius-sm)', border:'1.5px dashed var(--border-hover)', background:'var(--bg-surface)', color:'var(--text-faint)', fontSize:'1.5rem', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>+</button>
          )}
        </div>
        <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple
          style={{ display:'none' }} onChange={handleFiles} />
        {localError && <p className="form-error" style={{ marginTop:6 }}>{localError}</p>}
      </div>
      <div className="form-group">
        <label className="form-label">Description</label>
        <textarea className="form-input form-textarea" rows={3} value={form.description}
          onChange={e => f('description', e.target.value)} />
      </div>
      <div className="form-group">
        <label className="form-label">Composition</label>
        <textarea className="form-input form-textarea" rows={2} value={form.composition}
          onChange={e => f('composition', e.target.value)} />
      </div>
      <div className="form-group">
        <label className="form-label">Entretien</label>
        <textarea className="form-input form-textarea" rows={2} value={form.care}
          onChange={e => f('care', e.target.value)} />
      </div>
      {saveError && <p className="form-error">{saveError}</p>}
      <Button type="submit" loading={saving}>Enregistrer</Button>
    </form>
  )
}

// ── Product page ─────────────────────────────────────────────────────────────

export default function ProductPage() {
  const { id }       = useParams()
  const navigate     = useNavigate()
  const { user, profile } = useAuth()
  const { addItem }  = useCart()
  const founder      = isFounder(profile?.role)

  const [product, setProduct]   = useState(null)
  const [loading, setLoading]   = useState(true)
  const [activeImg, setActiveImg] = useState(0)

  const [editOpen, setEditOpen]   = useState(false)
  const [saving, setSaving]       = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [deleting, setDeleting]   = useState(false)

  useEffect(() => {
    fetchProduct()
  }, [id])

  async function fetchProduct() {
    setLoading(true)
    const { data } = await supabase.from('boutique_products').select('*').eq('id', id).single()
    setProduct(data ?? null)
    setLoading(false)
  }

  async function uploadImages(productId, files) {
    const urls = []
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const ext  = file.name.split('.').pop() ?? 'jpg'
      const path = `${productId}/${Date.now()}_${i}.${ext}`
      const { error } = await supabase.storage.from('boutique').upload(path, file, { upsert: true, contentType: file.type })
      if (error) continue
      const { data: { publicUrl } } = supabase.storage.from('boutique').getPublicUrl(path)
      urls.push(publicUrl)
    }
    return urls
  }

  async function handleSave({ form, existingImages, newFiles }) {
    setSaving(true)
    setSaveError(null)
    const payload = {
      name:           form.name.trim(),
      category:       form.category,
      original_price: parseFloat(form.original_price) || 0,
      is_promo:       form.is_promo,
      promo_percent:  form.is_promo && form.promo_percent ? parseInt(form.promo_percent) : null,
      description:    form.description.trim() || null,
      composition:    form.composition.trim() || null,
      care:           form.care.trim() || null,
    }
    const { error } = await supabase.from('boutique_products').update(payload).eq('id', id)
    if (error) { setSaveError(error.message); setSaving(false); return }

    const newUrls   = newFiles.length > 0 ? await uploadImages(id, newFiles) : []
    const allImages = [...existingImages, ...newUrls]
    await supabase.from('boutique_products').update({ images: allImages }).eq('id', id)

    await fetchProduct()
    setSaving(false)
    setEditOpen(false)
  }

  async function handleDelete() {
    if (!confirm(`Supprimer "${product.name}" ?`)) return
    setDeleting(true)
    await supabase.from('boutique_products').delete().eq('id', id)
    navigate('/boutique')
  }

  function handleAddCart() {
    if (!product) return
    const promo = computePromo(product.original_price, product.promo_percent)
    addItem({
      id:    product.id,
      name:  product.name,
      price: product.is_promo && promo ? parseFloat(promo) : parseFloat(product.original_price),
    })
  }

  if (loading) return <div className="page container"><p style={{ color: 'var(--text-faint)', marginTop: 40 }}>Chargement…</p></div>
  if (!product) return <div className="page container"><p style={{ color: 'var(--text-faint)', marginTop: 40 }}>Produit introuvable.</p></div>

  const images = product.images ?? []
  const promo  = computePromo(product.original_price, product.promo_percent)

  return (
    <div className="page container">
      <Link to="/boutique" className="product-page-back">← Retour à la boutique</Link>

      <div className="product-page-layout">

        {/* Gallery */}
        <div className="product-page-gallery">
          {images.length > 0 ? (
            <img src={images[activeImg]} alt={product.name} className="product-page-main-img" />
          ) : (
            <div className="product-page-placeholder">👕</div>
          )}
          {images.length > 1 && (
            <div className="product-page-thumbs">
              {images.map((url, i) => (
                <img
                  key={i}
                  src={url}
                  alt=""
                  className={`product-page-thumb ${i === activeImg ? 'active' : ''}`}
                  onClick={() => setActiveImg(i)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="product-page-info">
          {product.category && (
            <span className="product-page-cat-badge">{CAT_LABELS[product.category] ?? product.category}</span>
          )}

          <h1 className="product-page-name">{product.name}</h1>

          <div className="product-page-price-row">
            {product.is_promo && promo ? (
              <>
                <span className="product-page-price-original">{parseFloat(product.original_price).toFixed(2)} €</span>
                <span className="product-page-price-promo">{promo} €</span>
                <span className="product-page-promo-badge">−{product.promo_percent}%</span>
              </>
            ) : (
              <span className="product-page-price-normal">{parseFloat(product.original_price).toFixed(2)} €</span>
            )}
          </div>

          <div className="product-page-actions">
            <Button onClick={handleAddCart}>Ajouter au panier</Button>
          </div>

          {product.description && (
            <p className="product-page-description">{product.description}</p>
          )}

          {product.composition && (
            <div className="product-page-info-block">
              <p className="product-page-info-title">Composition</p>
              <p className="product-page-info-text">{product.composition}</p>
            </div>
          )}

          {product.care && (
            <div className="product-page-info-block">
              <p className="product-page-info-title">Entretien</p>
              <p className="product-page-info-text">{product.care}</p>
            </div>
          )}

          {founder && (
            <div className="product-page-founder-bar">
              <Button size="sm" variant="ghost" onClick={() => setEditOpen(true)}>✏️ Modifier</Button>
              <Button size="sm" variant="ghost" className="danger-btn" loading={deleting} onClick={handleDelete}>
                🗑 Supprimer
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Edit modal */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Modifier le produit">
        {editOpen && (
          <ProductForm
            initial={{
              form: {
                name:           product.name,
                category:       product.category,
                original_price: String(product.original_price),
                is_promo:       product.is_promo,
                promo_percent:  product.promo_percent ? String(product.promo_percent) : '',
                description:    product.description ?? '',
                composition:    product.composition ?? '',
                care:           product.care ?? '',
              },
              images: product.images ?? [],
            }}
            onSave={handleSave}
            saving={saving}
            saveError={saveError}
          />
        )}
      </Modal>
    </div>
  )
}
