import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useI18n } from '../../contexts/I18nContext'
import Modal from '../ui/Modal'
import Button from '../ui/Button'

export default function ResetPasswordModal() {
  const { isRecoveryMode, updatePassword } = useAuth()
  const { t } = useI18n()

  const [password, setPassword]     = useState('')
  const [confirm, setConfirm]       = useState('')
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState(null)
  const [success, setSuccess]       = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    if (password !== confirm) {
      setError(t.auth.reset_mismatch)
      return
    }

    setLoading(true)
    const { error } = await updatePassword(password)
    setLoading(false)

    if (error) { setError(error.message); return }
    setSuccess(true)
  }

  // Modal cannot be dismissed manually — user must complete or succeed
  return (
    <Modal open={isRecoveryMode} onClose={() => {}} title={t.auth.reset_title}>
      {success ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <p className="form-success">{t.auth.reset_saved}</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group">
            <label className="form-label" htmlFor="rp-password">{t.auth.reset_new}</label>
            <input
              id="rp-password"
              className="form-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              autoComplete="new-password"
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="rp-confirm">{t.auth.reset_confirm}</label>
            <input
              id="rp-confirm"
              className="form-input"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              autoComplete="new-password"
            />
          </div>

          {error && <p className="form-error">{error}</p>}

          <Button type="submit" variant="primary" size="lg" loading={loading} className="form-submit">
            {t.auth.reset_save}
          </Button>
        </form>
      )}
    </Modal>
  )
}
