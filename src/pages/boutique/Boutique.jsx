import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useCart } from '../../contexts/CartContext'
import { isFounder } from '../../lib/roles'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import ProductForm, { EMPTY_FORM, computePromo } from './ProductForm'
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

// ── Product card ─────────────────────────────────────────────────────────────

function ProductCard({ product, founder, onEdit, onDelete, onNavigate, onAddCart }) {
  const [imgIdx, setImgIdx] = useState(0)
  const images    = product.images ?? []
  const promo     = computePromo(product.original_price, product.promo_percent)
  const outOfStock = !product.in_stock
  const needsSize  = product.sizes?.length > 0

  return (
    <div
      className={`product-card ${outOfStock ? 'out-of-stock' : ''}`}
      onClick={() => !outOfStock && onNavigate(product.id)}
    >
      <div className="product-img-wrap">
        {images.length > 0 ? (
          <img src={images[imgIdx]} alt={product.name} className="product-img" />
        ) : (
          <div className="product-img-placeholder">👕</div>
        )}

        {product.is_promo && promo && !outOfStock && (
          <span className="product-promo-badge">−{product.promo_percent}%</span>
        )}

        {outOfStock && (
          <div className="product-stock-overlay">
            <span className="product-stock-label">Rupture de stock</span>
          </div>
        )}

        {images.length > 1 && (
          <div className="product-img-nav">
            {images.map((_, i) => (
              <span
                key={i}
                className={`product-img-dot ${i === imgIdx ? 'active' : ''}`}
                onClick={e => { e.stopPropagation(); setImgIdx(i) }}
              />
            ))}
          </div>
        )}

        {founder && (
          <div className="product-founder-actions">
            <button className="product-icon-btn" title="Modifier"
              onClick={e => { e.stopPropagation(); onEdit(product) }}>✏️</button>
            <button className="product-icon-btn delete" title="Supprimer"
              onClick={e => { e.stopPropagation(); onDelete(product) }}>🗑</button>
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
            disabled={outOfStock}
            onClick={e => { e.stopPropagation(); needsSize ? onNavigate(product.id) : onAddCart(product) }}
          >
            {outOfStock ? 'Indisponible' : needsSize ? 'Choisir la taille' : '+ Panier'}
          </Button>
        </div>
      </div>
    </div>
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
        sizes:          product.sizes ?? [],
        in_stock:       product.in_stock ?? true,
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
      sizes:          form.sizes,
      in_stock:       form.in_stock,
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
      size:  null,
    })
  }

  return (
    <div className="page container">
      <p className="section-label">AXWELD</p>
      <h1 className="section-title">Boutique</h1>
      <div className="divider" />

      <div className="boutique-layout">
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
                    onNavigate={id => navigate(`/boutique/${id}`)}
                    onAddCart={handleAddCart}
                  />
                ))
              )}
            </div>
          )}
        </div>
      </div>

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
            saving={saving}
            saveError={saveError}
          />
        )}
      </Modal>
    </div>
  )
}
