import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useCart } from '../../contexts/CartContext'
import { isFounder } from '../../lib/roles'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import './Boutique.css'

const CATEGORIES = [
  { id: 'all',        label: 'Tous nos produits' },
  { id: 'promo',      label: 'En promotion',      red: true },
  { id: 'tshirt',     label: 'T-shirt et polos' },
  { id: 'maillot',    label: 'Maillots' },
  { id: 'jogging',    label: 'Jogging' },
  { id: 'pull',       label: 'Pulls et hoodies' },
  { id: 'veste',      label: 'Veste et manteaux' },
  { id: 'short',      label: 'Short' },
  { id: 'accessoire', label: 'Accessoires' },
]

const CAT_OPTIONS = CATEGORIES.filter(c => c.id !== 'all' && c.id !== 'promo')

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

// ── Product detail modal ─────────────────────────────────────────────────────

function ProductDetail({ product, onClose, onAddCart }) {
  const [activeImg, setActiveImg] = useState(0)
  const images = product.images ?? []
  const promo  = computePromo(product.original_price, product.promo_percent)

  return (
    <div className="product-detail">
      {images.length > 0 && (
        <>
          <img src={images[activeImg]} alt={product.name} className="product-detail-main-img" />
          {images.length > 1 && (
            <div className="product-detail-gallery">
              {images.map((url, i) => (
                <img
                  key={i}
                  src={url}
                  alt=""
                  className={`product-detail-img ${i === activeImg ? 'active' : ''}`}
                  onClick={() => setActiveImg(i)}
                />
              ))}
            </div>
          )}
        </>
      )}

      <div className="product-detail-price-row">
        {product.is_promo && promo ? (
          <>
            <span className="product-price-original">{parseFloat(product.original_price).toFixed(2)} €</span>
            <span className="product-price-promo">{promo} €</span>
            <span className="product-promo-badge">−{product.promo_percent}%</span>
          </>
        ) : (
          <span className="product-price-normal">{parseFloat(product.original_price).toFixed(2)} €</span>
        )}
      </div>

      {product.description && (
        <p className="product-detail-description">{product.description}</p>
      )}

      <div className="product-detail-info">
        {product.composition && (
          <div className="product-detail-info-block">
            <p className="product-detail-info-title">Composition</p>
            <p className="product-detail-info-text">{product.composition}</p>
          </div>
        )}
        {product.care && (
          <div className="product-detail-info-block">
            <p className="product-detail-info-title">Entretien</p>
            <p className="product-detail-info-text">{product.care}</p>
          </div>
        )}
      </div>

      <Button
        onClick={() => {
          onAddCart(product)
          onClose()
        }}
      >
        Ajouter au panier
      </Button>
    </div>
  )
}

// ── Product card ─────────────────────────────────────────────────────────────

function ProductCard({ product, founder, onEdit, onDelete, onNavigate, onAddCart }) {
  const [imgIdx, setImgIdx] = useState(0)
  const images = product.images ?? []
  const promo  = computePromo(product.original_price, product.promo_percent)

  function handleImgDot(e, i) {
    e.stopPropagation()
    setImgIdx(i)
  }

  return (
    <div className="product-card" onClick={() => onNavigate(product.id)}>
      <div className="product-img-wrap">
        {images.length > 0 ? (
          <img src={images[imgIdx]} alt={product.name} className="product-img" />
        ) : (
          <div className="product-img-placeholder">👕</div>
        )}
        {product.is_promo && promo && (
          <span className="product-promo-badge">−{product.promo_percent}%</span>
        )}
        {images.length > 1 && (
          <div className="product-img-nav">
            {images.map((_, i) => (
              <span
                key={i}
                className={`product-img-dot ${i === imgIdx ? 'active' : ''}`}
                onClick={(e) => handleImgDot(e, i)}
              />
            ))}
          </div>
        )}
        {founder && (
          <div className="product-founder-actions">
            <button
              className="product-icon-btn"
              title="Modifier"
              onClick={(e) => { e.stopPropagation(); onEdit(product) }}
            >✏️</button>
            <button
              className="product-icon-btn delete"
              title="Supprimer"
              onClick={(e) => { e.stopPropagation(); onDelete(product) }}
            >🗑</button>
          </div>
        )}
      </div>

      <div className="product-body">
        <p className="product-name">{product.name}</p>

        <div className="product-price-row">
          {product.is_promo && promo ? (
            <>
              <span className="product-price-original">{parseFloat(product.original_price).toFixed(2)} €</span>
              <span className="product-price-promo">{promo} €</span>
            </>
          ) : (
            <span className="product-price-normal">{parseFloat(product.original_price).toFixed(2)} €</span>
          )}
        </div>

        {product.description && (
          <p className="product-desc-preview">{product.description}</p>
        )}

        <div className="product-add-btn">
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => { e.stopPropagation(); onAddCart(product) }}
          >
            + Panier
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── Product form (founder) ───────────────────────────────────────────────────

function ProductForm({ initial, onSave, onClose, saving, saveError }) {
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
  function removeNew(i)      { setNewFiles(p => p.filter((_,idx) => idx !== i)); setPreviews(p => p.filter((_,idx) => idx !== i)) }

  function handleSubmit(e) {
    e.preventDefault()
    onSave({ form, existingImages, newFiles })
  }

  return (
    <form className="product-form" onSubmit={handleSubmit}>
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
        <textarea className="form-input form-textarea" rows={3}
          value={form.description} onChange={e => f('description', e.target.value)}
          placeholder="Décrivez le produit..." />
      </div>

      <div className="form-group">
        <label className="form-label">Composition</label>
        <textarea className="form-input form-textarea" rows={2}
          value={form.composition} onChange={e => f('composition', e.target.value)}
          placeholder="Ex: 100% Polyester recyclé" />
      </div>

      <div className="form-group">
        <label className="form-label">Entretien</label>
        <textarea className="form-input form-textarea" rows={2}
          value={form.care} onChange={e => f('care', e.target.value)}
          placeholder="Ex: Lavage à 30°C, ne pas sécher en machine" />
      </div>

      {saveError && <p className="form-error">{saveError}</p>}

      <Button type="submit" loading={saving}>Enregistrer</Button>
    </form>
  )
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function Boutique() {
  const { user, profile } = useAuth()
  const { addItem }       = useCart()
  const navigate          = useNavigate()
  const founder           = isFounder(profile?.role)

  const [activeCategory, setActiveCategory] = useState('all')
  const [products, setProducts]             = useState([])
  const [loading, setLoading]               = useState(true)

  const [formOpen, setFormOpen]   = useState(false)
  const [editProduct, setEdit]    = useState(null)
  const [formInitial, setInitial] = useState(null)
  const [saving, setSaving]       = useState(false)
  const [saveError, setSaveError] = useState(null)

  useEffect(() => { fetchProducts() }, [])

  async function fetchProducts() {
    setLoading(true)
    const { data } = await supabase
      .from('boutique_products')
      .select('*')
      .order('created_at', { ascending: false })
    setProducts(data ?? [])
    setLoading(false)
  }

  const filtered = activeCategory === 'all'
    ? products
    : activeCategory === 'promo'
    ? products.filter(p => p.is_promo)
    : products.filter(p => p.category === activeCategory)

  function openAdd() {
    setEdit(null)
    setInitial({ form: { ...EMPTY_FORM }, images: [] })
    setSaveError(null)
    setFormOpen(true)
  }

  function openEdit(product) {
    setEdit(product)
    setInitial({
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
    })
    setSaveError(null)
    setFormOpen(true)
  }

  async function uploadImages(productId, files) {
    const urls = []
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const ext  = file.name.split('.').pop() ?? 'jpg'
      const path = `${productId}/${Date.now()}_${i}.${ext}`
      const { error } = await supabase.storage
        .from('boutique')
        .upload(path, file, { upsert: true, contentType: file.type })
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

    let productId

    if (editProduct) {
      const { error } = await supabase.from('boutique_products').update(payload).eq('id', editProduct.id)
      if (error) { setSaveError(error.message); setSaving(false); return }
      productId = editProduct.id
    } else {
      const { data, error } = await supabase
        .from('boutique_products')
        .insert({ ...payload, created_by: user.id })
        .select('id').single()
      if (error) { setSaveError(error.message); setSaving(false); return }
      productId = data.id
    }

    const newUrls   = newFiles.length > 0 ? await uploadImages(productId, newFiles) : []
    const allImages = [...existingImages, ...newUrls]
    await supabase.from('boutique_products').update({ images: allImages }).eq('id', productId)

    await fetchProducts()
    setSaving(false)
    setFormOpen(false)
  }

  async function handleDelete(product) {
    if (!confirm(`Supprimer "${product.name}" ?`)) return
    await supabase.from('boutique_products').delete().eq('id', product.id)
    setProducts(prev => prev.filter(p => p.id !== product.id))
  }

  function handleAddCart(product) {
    const promo = computePromo(product.original_price, product.promo_percent)
    addItem({
      id:    product.id,
      name:  product.name,
      price: product.is_promo && promo ? parseFloat(promo) : parseFloat(product.original_price),
    })
  }

  return (
    <div className="page container">
      <p className="section-label">AXWELD</p>
      <h1 className="section-title">Boutique</h1>
      <div className="divider" />

      <div className="boutique-layout">

        {/* Sidebar categories */}
        <aside className="boutique-sidebar">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              className={`boutique-cat-btn${cat.red ? ' promo' : ''}${activeCategory === cat.id ? ' active' : ''}`}
              onClick={() => setActiveCategory(cat.id)}
            >
              {cat.label}
            </button>
          ))}
        </aside>

        {/* Products */}
        <div>
          <div className="boutique-toolbar">
            <span className="boutique-count">
              {filtered.length} produit{filtered.length !== 1 ? 's' : ''}
            </span>
            {founder && (
              <Button size="sm" onClick={openAdd}>+ Ajouter un produit</Button>
            )}
          </div>

          {loading ? (
            <p style={{ color: 'var(--text-faint)' }}>Chargement…</p>
          ) : (
            <div className="boutique-grid">
              {filtered.length === 0 ? (
                <p className="boutique-empty">Aucun produit dans cette catégorie.</p>
              ) : (
                filtered.map(p => (
                  <ProductCard
                    key={p.id}
                    product={p}
                    founder={founder}
                    onEdit={openEdit}
                    onDelete={handleDelete}
                    onNavigate={(id) => navigate(`/boutique/${id}`)}
                    onAddCart={handleAddCart}
                  />
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit modal (founder) */}
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editProduct ? 'Modifier le produit' : 'Nouveau produit'}
      >
        {formInitial && (
          <ProductForm
            key={editProduct?.id ?? 'new'}
            initial={formInitial}
            onSave={handleSave}
            onClose={() => setFormOpen(false)}
            saving={saving}
            saveError={saveError}
          />
        )}
      </Modal>
    </div>
  )
}
