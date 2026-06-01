import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useI18n } from '../../contexts/I18nContext'
import Button from '../ui/Button'
import GdprModal from './GdprModal'
import './LoginForm.css'

export default function LoginForm({ onSuccess }) {
  const { signIn, signUp, resetPasswordEmail, signInWithDiscord } = useAuth()
  const { t } = useI18n()

  const [mode, setMode]         = useState('login') // 'login' | 'register' | 'forgot'
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [error, setError]       = useState(null)
  const [message, setMessage]   = useState(null)
  const [loading, setLoading]   = useState(false)

  // GDPR flow state
  const [gdprOpen, setGdprOpen]       = useState(false)
  const [pendingCreds, setPendingCreds] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setMessage(null)

    if (mode === 'login') {
      setLoading(true)
      const { error } = await signIn(email, password)
      setLoading(false)
      if (error) { setError(error.message); return }
      onSuccess?.()

    } else if (mode === 'register') {
      if (password !== confirm) {
        setError(t.auth.password_mismatch)
        return
      }
      // Show GDPR modal before creating the account
      setPendingCreds({ email, password })
      setGdprOpen(true)

    } else if (mode === 'forgot') {
      setLoading(true)
      const { error } = await resetPasswordEmail(email)
      setLoading(false)
      if (error) { setError(error.message); return }
      setMessage(t.auth.forgot_sent)
    }
  }

  async function handleGdprAccept() {
    setGdprOpen(false)
    setLoading(true)
    const { error } = await signUp(pendingCreds.email, pendingCreds.password, true)
    setLoading(false)
    setPendingCreds(null)
    if (error) { setError(error.message); return }
    setMessage(t.auth.check_email)
  }

  function handleGdprRefuse() {
    setGdprOpen(false)
    setPendingCreds(null)
    setMessage(t.auth.gdpr_cancelled)
  }

  function goTo(newMode) {
    setMode(newMode)
    setError(null)
    setMessage(null)
    setConfirm('')
  }

  async function handleDiscordLogin() {
    setError(null)
    const { error } = await signInWithDiscord()
    if (error) setError(error.message)
  }

  const isForgot   = mode === 'forgot'
  const isRegister = mode === 'register'

  return (
    <>
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

        {!isForgot && (
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
            {mode === 'login' && (
              <button
                type="button"
                className="form-forgot-link"
                onClick={() => goTo('forgot')}
              >
                {t.auth.forgot_link}
              </button>
            )}
          </div>
        )}

        {mode === 'register' && (
          <div className="form-group">
            <label className="form-label" htmlFor="confirm">{t.auth.confirm_password}</label>
            <input
              id="confirm"
              className="form-input"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder={t.auth.password_ph}
              required
              minLength={6}
              autoComplete="new-password"
            />
          </div>
        )}

        {error   && <p className="form-error">{error}</p>}
        {message && <p className="form-success">{message}</p>}

        <Button type="submit" variant="primary" size="lg" loading={loading} className="form-submit">
          {isForgot   ? t.auth.forgot_send   :
           isRegister ? t.auth.create_account :
                        t.auth.sign_in}
        </Button>

        {!isForgot && (
          <>
            <div className="form-divider"><span>{t.auth.or}</span></div>
            <button
              type="button"
              className="discord-oauth-btn"
              onClick={handleDiscordLogin}
            >
              <img
                src={`${import.meta.env.BASE_URL}Discordlogo.png`}
                alt=""
                aria-hidden
                className="discord-oauth-icon"
              />
              {t.auth.discord_btn}
            </button>
          </>
        )}

        {isForgot ? (
          <p className="form-switch">
            <button type="button" className="form-switch-btn" onClick={() => goTo('login')}>
              {t.auth.forgot_back}
            </button>
          </p>
        ) : (
          <p className="form-switch">
            {mode === 'login' ? t.auth.no_account : t.auth.have_account}{' '}
            <button type="button" className="form-switch-btn" onClick={() => goTo(mode === 'login' ? 'register' : 'login')}>
              {mode === 'login' ? t.auth.sign_up_link : t.auth.sign_in_link}
            </button>
          </p>
        )}

      </form>

      <GdprModal
        open={gdprOpen}
        onAccept={handleGdprAccept}
        onRefuse={handleGdprRefuse}
      />
    </>
  )
}
