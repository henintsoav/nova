import { useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useCart } from '../../contexts/CartContext'
import Button from '../../components/ui/Button'
import './CartPage.css'

export default function CartSuccess() {
  const [searchParams] = useSearchParams()
  const { clearCart } = useCart()
  const orderId = searchParams.get('order_id')

  useEffect(() => {
    clearCart()
  }, [])

  return (
    <div className="page container">
      <p className="section-label">AXWELD</p>
      <h1 className="section-title">Commande confirmée</h1>
      <div className="divider" />

      <div className="cart-success">
        <div className="cart-success-icon">✅</div>
        <p className="cart-success-title">Paiement réussi !</p>
        <p className="cart-success-text">
          Votre commande a bien été enregistrée et votre paiement a été confirmé.
          Vous recevrez prochainement un e-mail de confirmation.
          {orderId && (
            <>
              <br /><br />
              Référence commande :{' '}
              <strong style={{ color: 'var(--text)', fontFamily: 'monospace' }}>
                #{orderId.slice(0, 8).toUpperCase()}
              </strong>
            </>
          )}
        </p>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
          <Link to="/boutique">
            <Button variant="ghost">Retourner à la boutique</Button>
          </Link>
          <Link to="/">
            <Button variant="ghost">Accueil</Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
