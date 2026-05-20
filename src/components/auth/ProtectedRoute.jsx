import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import LoginForm from './LoginForm'
import Modal from '../ui/Modal'
import './ProtectedRoute.css'

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  const [authOpen, setAuthOpen] = useState(true)

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
          <h2>Members Only</h2>
          <p>Sign in to access the Scrims area.</p>
        </div>
        <Modal open={authOpen} onClose={() => setAuthOpen(false)} title="Sign in to continue">
          <LoginForm onSuccess={() => setAuthOpen(false)} />
        </Modal>
        {!authOpen && (
          <button className="protected-reopen" onClick={() => setAuthOpen(true)}>
            Sign in
          </button>
        )}
      </div>
    )
  }

  return children
}
