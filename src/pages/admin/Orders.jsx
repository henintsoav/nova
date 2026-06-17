import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { isFounder } from '../../lib/roles'
import Modal from '../../components/ui/Modal'
import './Orders.css'

const STATUS_LABELS = {
  pending:   'En attente',
  paid:      'Payée',
  shipped:   'Expédiée',
  cancelled: 'Annulée',
}
const STATUS_COLORS = {
  pending:   '#9CA3AF',
  paid:      '#10B981',
  shipped:   '#3B82F6',
  cancelled: '#ef4444',
}

export default function Orders() {
  const { profile }  = useAuth()
  const navigate     = useNavigate()

  const [orders, setOrders]   = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter]   = useState('all')
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    if (profile && !isFounder(profile?.role)) { navigate('/'); return }
    if (profile) fetchOrders()
  }, [profile])

  async function fetchOrders() {
    setLoading(true)
    const { data } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
    setOrders(data ?? [])
    setLoading(false)
  }

  async function updateStatus(orderId, status) {
    await supabase.from('orders').update({ status }).eq('id', orderId)
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o))
    if (selected?.id === orderId) setSelected(prev => ({ ...prev, status }))
  }

  const filterCounts = {
    all:       orders.length,
    paid:      orders.filter(o => o.status === 'paid').length,
    pending:   orders.filter(o => o.status === 'pending').length,
    shipped:   orders.filter(o => o.status === 'shipped').length,
    cancelled: orders.filter(o => o.status === 'cancelled').length,
  }
  const filtered = filter === 'all' ? orders : orders.filter(o => o.status === filter)

  return (
    <div className="page container">
      <p className="section-label">AXWELD — Admin</p>
      <h1 className="section-title">Commandes</h1>
      <div className="divider" />

      {/* Onglets de filtre */}
      <div className="orders-filters">
        {['all', 'paid', 'pending', 'shipped', 'cancelled'].map(f => (
          <button
            key={f}
            className={`orders-filter-btn ${filter === f ? 'active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? 'Toutes' : STATUS_LABELS[f]}
            <span className="orders-filter-count">{filterCounts[f]}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-faint)', marginTop: 24 }}>Chargement…</p>
      ) : filtered.length === 0 ? (
        <p style={{ color: 'var(--text-faint)', marginTop: 24 }}>Aucune commande dans cette catégorie.</p>
      ) : (
        <div className="orders-table-wrap">
          <table className="orders-table">
            <thead>
              <tr>
                <th>Référence</th>
                <th>Date</th>
                <th>Client</th>
                <th>Articles</th>
                <th>Total</th>
                <th>Statut</th>
                <th>Changer statut</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(order => {
                const itemCount = Array.isArray(order.items)
                  ? order.items.reduce((s, i) => s + (i.qty || 1), 0)
                  : 0
                return (
                  <tr
                    key={order.id}
                    className="orders-row"
                    onClick={() => setSelected(order)}
                  >
                    <td className="orders-ref">
                      #{order.id.slice(0, 8).toUpperCase()}
                    </td>
                    <td className="orders-date">
                      {new Date(order.created_at).toLocaleDateString('fr-FR', {
                        day: '2-digit', month: 'short', year: 'numeric',
                      })}
                    </td>
                    <td className="orders-client">
                      <p>{order.shipping_name}</p>
                      {order.pseudo && order.pseudo !== order.shipping_name && (
                        <p className="orders-pseudo">@{order.pseudo}</p>
                      )}
                      <p className="orders-client-email">{order.shipping_email}</p>
                    </td>
                    <td className="orders-items-count">
                      {itemCount} article{itemCount > 1 ? 's' : ''}
                    </td>
                    <td className="orders-total">
                      {parseFloat(order.total).toFixed(2)} €
                    </td>
                    <td>
                      <span
                        className="orders-status"
                        style={{ color: STATUS_COLORS[order.status] }}
                      >
                        ● {STATUS_LABELS[order.status]}
                      </span>
                    </td>
                    <td onClick={e => e.stopPropagation()}>
                      <select
                        className="orders-status-select"
                        value={order.status}
                        onChange={e => updateStatus(order.id, e.target.value)}
                      >
                        {Object.entries(STATUS_LABELS).map(([val, label]) => (
                          <option key={val} value={val}>{label}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal détail commande */}
      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? `Commande #${selected.id.slice(0, 8).toUpperCase()}` : ''}
      >
        {selected && (
          <OrderDetail
            order={selected}
            onStatusChange={status => updateStatus(selected.id, status)}
          />
        )}
      </Modal>
    </div>
  )
}

// ── Détail d'une commande ─────────────────────────────────────────────────────

function OrderDetail({ order, onStatusChange }) {
  const itemCount = Array.isArray(order.items)
    ? order.items.reduce((s, i) => s + (i.qty || 1), 0)
    : 0

  return (
    <div className="order-detail">
      {/* Statut */}
      <div className="order-detail-section">
        <p className="order-detail-label">Statut</p>
        <div className="order-detail-status-row">
          <span style={{ color: STATUS_COLORS[order.status], fontWeight: 700 }}>
            ● {STATUS_LABELS[order.status]}
          </span>
          <select
            className="orders-status-select"
            value={order.status}
            onChange={e => onStatusChange(e.target.value)}
          >
            {Object.entries(STATUS_LABELS).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Client */}
      <div className="order-detail-section">
        <p className="order-detail-label">Client</p>
        <p className="order-detail-value">{order.shipping_name}</p>
        {order.pseudo && order.pseudo !== order.shipping_name && (
          <p className="order-detail-sub">Pseudo : @{order.pseudo}</p>
        )}
        <p className="order-detail-sub">{order.shipping_email}</p>
        {order.shipping_phone && (
          <p className="order-detail-sub">{order.shipping_phone}</p>
        )}
      </div>

      {/* Adresse de livraison */}
      <div className="order-detail-section">
        <p className="order-detail-label">Adresse de livraison</p>
        <p className="order-detail-value">{order.shipping_address}</p>
        <p className="order-detail-value">{order.shipping_zip} {order.shipping_city}</p>
        <p className="order-detail-sub">{order.shipping_country}</p>
      </div>

      {/* Articles */}
      <div className="order-detail-section">
        <p className="order-detail-label">Articles ({itemCount})</p>
        <div className="order-detail-items">
          {Array.isArray(order.items) && order.items.map((item, i) => (
            <div key={i} className="order-detail-item">
              <div className="order-detail-item-info">
                <span className="order-detail-item-name">{item.name}</span>
                {item.size && (
                  <span className="order-detail-item-size">{item.size}</span>
                )}
              </div>
              <span className="order-detail-item-qty">× {item.qty}</span>
              <span className="order-detail-item-price">
                {(item.price * item.qty).toFixed(2)} €
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Récapitulatif prix */}
      <div className="order-detail-section">
        <p className="order-detail-label">Récapitulatif</p>
        <div className="order-detail-breakdown">
          <div className="order-detail-row">
            <span>Sous-total</span>
            <span>{parseFloat(order.subtotal).toFixed(2)} €</span>
          </div>
          {parseFloat(order.discount_amount) > 0 && (
            <div className="order-detail-row discount">
              <span>Réduction {order.promo_code ? `(${order.promo_code})` : ''}</span>
              <span>−{parseFloat(order.discount_amount).toFixed(2)} €</span>
            </div>
          )}
          <div className="order-detail-row total">
            <span>Total payé</span>
            <span>{parseFloat(order.total).toFixed(2)} €</span>
          </div>
        </div>
      </div>

      {/* Dates */}
      <div className="order-detail-section">
        <p className="order-detail-label">Dates</p>
        <p className="order-detail-sub">
          Créée le {new Date(order.created_at).toLocaleString('fr-FR')}
        </p>
        {order.paid_at && (
          <p className="order-detail-sub">
            Payée le {new Date(order.paid_at).toLocaleString('fr-FR')}
          </p>
        )}
      </div>
    </div>
  )
}
