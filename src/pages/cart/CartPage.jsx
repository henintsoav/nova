import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useCart } from '../../contexts/CartContext'
import { useAuth } from '../../contexts/AuthContext'
import Button from '../../components/ui/Button'
import './CartPage.css'

function computeDiscount(promoData, subtotal) {
  if (!promoData) return 0
  if (promoData.discount_type === 'percent') {
    return parseFloat((subtotal * promoData.discount_value / 100).toFixed(2))
  }
  return Math.min(parseFloat(promoData.discount_value), subtotal)
}

const EMPTY_SHIPPING = { name: '', email: '', phone: '', address: '', city: '', zip: '', country: 'France' }

export default function CartPage() {
  const { items, removeItem, updateQty } = useCart()
  const { user, profile } = useAuth()

  const [step, setStep] = useState('cart') // 'cart' | 'shipping'

  const [promoCode, setPromoCode]       = useState('')
  const [promoData, setPromoData]       = useState(null)
  const [promoError, setPromoError]     = useState(null)
  const [promoLoading, setPromoLoading] = useState(false)

  const [shipping, setShipping]         = useState(EMPTY_SHIPPING)
  const [checking, setChecking]         = useState(false)
  const [checkoutError, setCheckoutError] = useState(null)

  const [removedNames, setRemovedNames] = useState([])

  // Retire automatiquement les articles en rupture de stock
  useEffect(() => {
    if (items.length === 0) return
    const ids = [...new Set(items.map(i => i.id))]
    supabase
      .from('boutique_products')
      .select('id, in_stock, name')
      .in('id', ids)
      .then(({ data }) => {
        if (!data) return
        const oosIds = new Set(data.filter(p => !p.in_stock).map(p => p.id))
        if (oosIds.size === 0) return
        const removed = []
        for (const item of items) {
          if (oosIds.has(item.id)) {
            removeItem(item.cartKey)
            if (!removed.includes(item.name)) removed.push(item.name)
          }
        }
        if (removed.length > 0) setRemovedNames(removed)
      })
  }, [])

  // Pré-remplit l'e-mail si l'utilisateur est connecté
  useEffect(() => {
    if (user?.email) setShipping(s => ({ ...s, email: s.email || user.email }))
    if (profile?.pseudo) setShipping(s => ({ ...s, name: s.name || profile.pseudo }))
  }, [user, profile])

  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0)
  const discount = computeDiscount(promoData, subtotal)
  const total    = Math.max(0, subtotal - discount)

  async function applyPromo() {
    const code = promoCode.trim().toUpperCase()
    if (!code) return
    setPromoLoading(true)
    setPromoError(null)
    setPromoData(null)

    const { data, error } = await supabase
      .from('promo_codes')
      .select('*')
      .eq('code', code)
      .eq('active', true)
      .single()

    if (error || !data) {
      setPromoError('Code invalide ou inactif.')
      setPromoLoading(false)
      return
    }
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      setPromoError('Ce code de promotion a expiré.')
      setPromoLoading(false)
      return
    }
    if (data.max_uses != null && data.uses_count >= data.max_uses) {
      setPromoError("Ce code a atteint son nombre maximum d'utilisations.")
      setPromoLoading(false)
      return
    }
    if (data.min_order != null && subtotal < data.min_order) {
      setPromoError(`Commande minimum de ${parseFloat(data.min_order).toFixed(2)} € requise pour ce code.`)
      setPromoLoading(false)
      return
    }

    setPromoData(data)
    setPromoLoading(false)
  }

  function removePromo() { setPromoData(null); setPromoCode(''); setPromoError(null) }

  function validateShipping() {
    if (!shipping.name.trim())    return "Le nom est requis."
    if (!shipping.email.trim())   return "L'e-mail est requis."
    if (!shipping.address.trim()) return "L'adresse est requise."
    if (!shipping.city.trim())    return "La ville est requise."
    if (!shipping.zip.trim())     return "Le code postal est requis."
    return null
  }

  async function handleCheckout(e) {
    e.preventDefault()
    const err = validateShipping()
    if (err) { setCheckoutError(err); return }

    setChecking(true)
    setCheckoutError(null)

    try {
      const appUrl = window.location.origin + window.location.pathname

      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: {
          items: items.map(i => ({
            id: i.id, name: i.name, price: i.price, size: i.size ?? null, qty: i.qty,
          })),
          shipping,
          promo_code:      promoData?.code     ?? null,
          discount_amount: discount,
          subtotal,
          total,
          user_id: user?.id   ?? null,
          pseudo:  profile?.pseudo ?? null,
          app_url: appUrl,
        },
      })

      if (error) throw new Error(error.message)
      if (data?.error) throw new Error(data.error)

      window.location.href = data.url
    } catch (err) {
      setCheckoutError(err.message || 'Une erreur est survenue. Veuillez réessayer.')
      setChecking(false)
    }
  }

  const sidebar = (
    <div className="cart-summary">
      <p className="cart-summary-title">Résumé de commande</p>

      {/* Code promo */}
      <div>
        <p style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8 }}>
          Code de promotion
        </p>
        {promoData ? (
          <div className="promo-valid">
            <span className="promo-valid-label">
              {promoData.code} — {promoData.discount_type === 'percent'
                ? `−${promoData.discount_value}%`
                : `−${parseFloat(promoData.discount_value).toFixed(2)} €`}
            </span>
            <button className="promo-valid-remove" onClick={removePromo}>✕ Retirer</button>
          </div>
        ) : (
          <>
            <div className="promo-row">
              <input
                className="form-input promo-input"
                placeholder="CODE PROMO"
                value={promoCode}
                onChange={e => { setPromoCode(e.target.value.toUpperCase()); setPromoError(null) }}
                onKeyDown={e => e.key === 'Enter' && applyPromo()}
              />
              <Button size="sm" loading={promoLoading} onClick={applyPromo}>Appliquer</Button>
            </div>
            {promoError && <p className="promo-error" style={{ marginTop: 6 }}>{promoError}</p>}
          </>
        )}
      </div>

      {/* Récapitulatif prix */}
      <div className="cart-breakdown">
        <div className="cart-breakdown-row">
          <span>Sous-total</span>
          <span>{subtotal.toFixed(2)} €</span>
        </div>
        {discount > 0 && (
          <div className="cart-breakdown-row discount">
            <span>Réduction ({promoData.code})</span>
            <span>−{discount.toFixed(2)} €</span>
          </div>
        )}
        <div className="cart-breakdown-row">
          <span>Livraison</span>
          <span style={{ color: 'var(--text-faint)' }}>À définir</span>
        </div>
        <div className="cart-breakdown-row total">
          <span>Total</span>
          <span>{total.toFixed(2)} €</span>
        </div>
      </div>

      {step === 'cart' ? (
        <Button style={{ width: '100%' }} onClick={() => setStep('shipping')}>
          Finaliser la commande →
        </Button>
      ) : (
        <>
          {checkoutError && (
            <p className="promo-error">{checkoutError}</p>
          )}
          <Button
            style={{ width: '100%' }}
            loading={checking}
            onClick={handleCheckout}
          >
            Payer en ligne →
          </Button>
          <button
            className="cart-back-btn"
            onClick={() => { setStep('cart'); setCheckoutError(null) }}
          >
            ← Retour au panier
          </button>
        </>
      )}

      <Link to="/boutique" style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-faint)', display: 'block' }}>
        ← Continuer mes achats
      </Link>
    </div>
  )

  return (
    <div className="page container">
      <p className="section-label">AXWELD</p>
      <h1 className="section-title">Mon panier</h1>
      <div className="divider" />

      {removedNames.length > 0 && (
        <div className="cart-oos-notice">
          <strong>Article{removedNames.length > 1 ? 's' : ''} retiré{removedNames.length > 1 ? 's' : ''} du panier :</strong>
          {' '}{removedNames.join(', ')} — en rupture de stock.
        </div>
      )}

      {items.length === 0 ? (
        <div className="cart-page-empty">
          <p>Votre panier est actuellement vide.</p>
          <Link to="/boutique"><Button>Découvrir la boutique</Button></Link>
        </div>
      ) : (
        <div className="cart-page-layout">
          {/* Colonne gauche */}
          {step === 'cart' ? (
            <div className="cart-page-items">
              {items.map(item => (
                <CartLine
                  key={item.cartKey}
                  item={item}
                  onUpdateQty={qty => updateQty(item.cartKey, qty)}
                  onRemove={() => removeItem(item.cartKey)}
                />
              ))}
            </div>
          ) : (
            <ShippingForm value={shipping} onChange={setShipping} />
          )}

          {/* Colonne droite */}
          {sidebar}
        </div>
      )}
    </div>
  )
}

// ── Shipping form ─────────────────────────────────────────────────────────────

function ShippingForm({ value, onChange }) {
  function f(field, val) { onChange(prev => ({ ...prev, [field]: val })) }

  return (
    <div className="shipping-form">
      <h2 className="shipping-form-title">Informations de livraison</h2>

      <div className="form-group">
        <label className="form-label">Prénom et Nom *</label>
        <input
          className="form-input"
          value={value.name}
          onChange={e => f('name', e.target.value)}
          placeholder="Marie Dupont"
          required
        />
      </div>

      <div className="shipping-form-row">
        <div className="form-group">
          <label className="form-label">E-mail *</label>
          <input
            className="form-input"
            type="email"
            value={value.email}
            onChange={e => f('email', e.target.value)}
            placeholder="marie@exemple.fr"
            required
          />
        </div>
        <div className="form-group">
          <label className="form-label">Téléphone</label>
          <input
            className="form-input"
            type="tel"
            value={value.phone}
            onChange={e => f('phone', e.target.value)}
            placeholder="06 12 34 56 78"
          />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Adresse *</label>
        <input
          className="form-input"
          value={value.address}
          onChange={e => f('address', e.target.value)}
          placeholder="12 rue de la Paix"
          required
        />
      </div>

      <div className="shipping-form-row">
        <div className="form-group">
          <label className="form-label">Ville *</label>
          <input
            className="form-input"
            value={value.city}
            onChange={e => f('city', e.target.value)}
            placeholder="Nantes"
            required
          />
        </div>
        <div className="form-group">
          <label className="form-label">Code postal *</label>
          <input
            className="form-input"
            value={value.zip}
            onChange={e => f('zip', e.target.value)}
            placeholder="44000"
            required
          />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Pays</label>
        <input
          className="form-input"
          value={value.country}
          onChange={e => f('country', e.target.value)}
        />
      </div>

      <p className="shipping-form-note">
        Vos informations sont transmises de manière sécurisée. Le paiement s'effectue sur la plateforme Stripe.
      </p>
    </div>
  )
}

// ── Cart line ─────────────────────────────────────────────────────────────────

function CartLine({ item, onUpdateQty, onRemove }) {
  const [imgError, setImgError] = useState(false)

  return (
    <div className="cart-line">
      {item.image && !imgError ? (
        <img src={item.image} alt={item.name} className="cart-line-img" onError={() => setImgError(true)} />
      ) : (
        <div className="cart-line-img-placeholder">👕</div>
      )}

      <div className="cart-line-info">
        <p className="cart-line-name">{item.name}</p>
        <div className="cart-line-meta">
          {item.size && <span className="cart-line-size">{item.size}</span>}
          <span className="cart-line-unit-price">{item.price.toFixed(2)} € / unité</span>
        </div>
      </div>

      <div className="cart-line-qty">
        <button className="cart-qty-btn" onClick={() => onUpdateQty(item.qty - 1)}>−</button>
        <span className="cart-qty-val">{item.qty}</span>
        <button className="cart-qty-btn" onClick={() => onUpdateQty(item.qty + 1)}>+</button>
      </div>

      <span className="cart-line-price">{(item.price * item.qty).toFixed(2)} €</span>

      <button className="cart-line-remove" onClick={onRemove} title="Supprimer">✕</button>
    </div>
  )
}
