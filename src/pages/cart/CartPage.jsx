import { useState } from 'react'
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

export default function CartPage() {
  const { items, removeItem, updateQty } = useCart()
  const { user } = useAuth()

  const [promoCode, setPromoCode]   = useState('')
  const [promoData, setPromoData]   = useState(null)
  const [promoError, setPromoError] = useState(null)
  const [promoLoading, setPromoLoading] = useState(false)

  const [ordering, setOrdering]     = useState(false)
  const [success, setSuccess]       = useState(false)

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

  async function handleOrder() {
    setOrdering(true)
    // Increment uses_count if promo used
    if (promoData) {
      await supabase
        .from('promo_codes')
        .update({ uses_count: (promoData.uses_count ?? 0) + 1 })
        .eq('id', promoData.id)
    }
    // Simulate a short delay then show success
    await new Promise(r => setTimeout(r, 800))
    setOrdering(false)
    setSuccess(true)
  }

  if (success) {
    return (
      <div className="page container">
        <p className="section-label">AXWELD</p>
        <h1 className="section-title">Panier</h1>
        <div className="divider" />
        <div className="cart-success">
          <div className="cart-success-icon">✅</div>
          <p className="cart-success-title">Commande confirmée !</p>
          <p className="cart-success-text">
            Merci pour votre commande. Notre équipe va vous contacter prochainement pour finaliser la livraison.
          </p>
          <Link to="/boutique">
            <Button variant="ghost">Retourner à la boutique</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="page container">
      <p className="section-label">AXWELD</p>
      <h1 className="section-title">Mon panier</h1>
      <div className="divider" />

      {items.length === 0 ? (
        <div className="cart-page-empty">
          <p>Votre panier est actuellement vide.</p>
          <Link to="/boutique"><Button>Découvrir la boutique</Button></Link>
        </div>
      ) : (
        <div className="cart-page-layout">

          {/* ── Articles ── */}
          <div>
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
          </div>

          {/* ── Résumé ── */}
          <div className="cart-summary">
            <p className="cart-summary-title">Résumé de commande</p>

            {/* Promo code */}
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

            {/* Breakdown */}
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

            <Button loading={ordering} onClick={handleOrder} style={{ width: '100%' }}>
              Valider la commande
            </Button>

            <Link to="/boutique" style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-faint)', display: 'block' }}>
              ← Continuer mes achats
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Cart line ────────────────────────────────────────────────────────────────

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
