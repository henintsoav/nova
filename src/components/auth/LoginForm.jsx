import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useI18n } from '../../contexts/I18nContext'
import Button from '../ui/Button'
import './LoginForm.css'

export default function LoginForm({ onSuccess }) {
  const { signIn, signUp } = useAuth()
  const { t }              = useI18n()
  const [mode, setMode]       = useState('login')
  const [email, setEmail]     = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]     = useState(null)
  const [message, setMessage] = useState(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setMessage(null)
    setLoading(true)

    if (mode === 'login') {
      const { error } = await signIn(email, password)
      setLoading(false)
      if (error) { setError(error.message); return }
      onSuccess?.()
    } else {
      const { error } = await signUp(email, password)
      setLoading(false)
      if (error) { setError(error.message); return }
      setMessage(t.auth.check_email)
    }
  }

  function switchMode() {
    setMode(mode === 'login' ? 'register' : 'login')
    setError(null)
    setMessage(null)
  }

  return (
    <form className="login-form" onSubmit={handleSubmit}>
      <div className="form-group">
        <label className="form-label" htmlFor="email">{t.auth.email}</label>
        <input
          id="email"
          className="form-input"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t.auth.email_ph}
          required
          autoComplete="email"
        />
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="password">{t.auth.password}</label>
        <input
          id="password"
          className="form-input"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={t.auth.password_ph}
          required
          minLength={6}
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
        />
      </div>

      {error   && <p className="form-error">{error}</p>}
      {message && <p className="form-success">{message}</p>}

      <Button type="submit" variant="primary" size="lg" loading={loading} className="form-submit">
        {mode === 'login' ? t.auth.sign_in : t.auth.create_account}
      </Button>

      <p className="form-switch">
        {mode === 'login' ? t.auth.no_account : t.auth.have_account}{' '}
        <button type="button" className="form-switch-btn" onClick={switchMode}>
          {mode === 'login' ? t.auth.sign_up_link : t.auth.sign_in_link}
        </button>
      </p>
    </form>
  )
}
