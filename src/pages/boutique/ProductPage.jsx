import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useCart } from '../../contexts/CartContext'
import { isFounder } from '../../lib/roles'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import ProductForm, { computePromo } from './ProductForm'
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

export default function ProductPage() {
  const { id }            = useParams()
  const navigate          = useNavigate()
  const { user, profile } = useAuth()
  const { addItem }       = useCart()
  const founder           = isFounder(profile?.role)

  const [product, setProduct]     = useState(null)
  const [loading, setLoading]     = useState(true)
  const [activeImg, setActiveImg] = useState(0)

  const [selectedSize, setSelectedSize] = useState(null)
  const [sizeError, setSizeError]       = useState(null)

  const [editOpen, setEditOpen]   = useState(false)
  const [saving, setSaving]       = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [deleting, setDeleting]   = useState(false)

  useEffect(() => { fetchProduct() }, [id])
  useEffect(() => { setSelectedSize(null); setSizeError(null) }, [id])

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
    const sizes = product.sizes ?? []
    if (sizes.length > 0 && !selectedSize) {
      setSizeError('Veuillez sélectionner une taille.')
      return
    }
    setSizeError(null)
    const promo = computePromo(product.original_price, product.promo_percent)
    addItem({
      id:    product.id,
      name:  product.name,
      price: product.is_promo && promo ? parseFloat(promo) : parseFloat(product.original_price),
      size:  selectedSize,
    })
  }

  if (loading) return (
    <div className="page container">
      <p style={{ color: 'var(--text-faint)', marginTop: 40 }}>Chargement…</p>
    </div>
  )
  if (!product) return (
    <div className="page container">
      <Link to="/boutique" className="product-page-back">← Retour à la boutique</Link>
      <p style={{ color: 'var(--text-faint)', marginTop: 24 }}>Produit introuvable.</p>
    </div>
  )

  const images     = product.images ?? []
  const sizes      = product.sizes ?? []
  const promo      = computePromo(product.original_price, product.promo_percent)
  const outOfStock = !product.in_stock

  return (
    <div className="page container">
      <Link to="/boutique" className="product-page-back">← Retour à la boutique</Link>

      <div className={`product-page-layout ${outOfStock ? 'product-page-oos' : ''}`}>

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
                <img key={i} src={url} alt=""
                  className={`product-page-thumb ${i === activeImg ? 'active' : ''}`}
                  onClick={() => setActiveImg(i)} />
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

          {outOfStock && (
            <div className="product-page-oos-banner">Rupture de stock</div>
          )}

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

          {/* Size selector */}
          {sizes.length > 0 && (
            <div className="product-page-sizes">
              <p className="product-page-sizes-label">Taille</p>
              <div className="product-page-size-grid">
                {sizes.map(size => (
                  <button
                    key={size}
                    type="button"
                    className={`product-size-btn ${selectedSize === size ? 'active' : ''}`}
                    onClick={() => { setSelectedSize(size); setSizeError(null) }}
                    disabled={outOfStock}
                  >
                    {size}
                  </button>
                ))}
              </div>
              {sizeError && <p className="product-size-error">{sizeError}</p>}
            </div>
          )}

          <div className="product-page-actions">
            <Button onClick={handleAddCart} disabled={outOfStock}>
              {outOfStock ? 'Indisponible' : 'Ajouter au panier'}
            </Button>
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
                sizes:          product.sizes ?? [],
                in_stock:       product.in_stock ?? true,
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
