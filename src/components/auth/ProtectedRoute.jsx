import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useI18n } from '../../contexts/I18nContext'
import LoginForm from './LoginForm'
import Modal from '../ui/Modal'
import './ProtectedRoute.css'

// roleGuard: optional (profile) => boolean
// If provided and returns false for a logged-in user, redirects to home.
export default function ProtectedRoute({ children, roleGuard }) {
  const { user, profile, loading } = useAuth()
  const { t }                      = useI18n()
  const [authOpen, setAuthOpen]    = useState(true)

  if (loading) {
    return (
      <div className="protected-loading">
        <span className="spinner" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="protected-gate">
        <div className="protected-gate-content">
          <div className="protected-lock">🔒</div>
          <h2>{t.protected.members_only}</h2>
          <p>{t.protected.sign_in_msg}</p>
        </div>
        <Modal open={authOpen} onClose={() => setAuthOpen(false)} title={t.protected.sign_in_title}>
          <LoginForm onSuccess={() => setAuthOpen(false)} />
        </Modal>
        {!authOpen && (
          <button className="protected-reopen" onClick={() => setAuthOpen(true)}>
            {t.protected.sign_in_btn}
          </button>
        )}
      </div>
    )
  }

  // Role guard: logged-in but insufficient role → redirect silently
  if (roleGuard && !roleGuard(profile)) {
    return <Navigate to="/" replace />
  }

  return children
}
