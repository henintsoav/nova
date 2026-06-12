import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useI18n } from '../../contexts/I18nContext'
import Modal from '../ui/Modal'
import Button from '../ui/Button'

export default function ReactivateModal() {
  const { isDeletedAccount, reactivateAccount, signOut } = useAuth()
  const { t } = useI18n()

  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)

  async function handleReactivate() {
    setLoading(true)
    setError(null)
    const { error } = await reactivateAccount()
    setLoading(false)
    if (error) setError(error.message)
  }

  async function handleDecline() {
    await signOut()
  }

  return (
    <Modal open={isDeletedAccount} onClose={() => {}} title={t.reactivate.title}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.6 }}>
          {t.reactivate.message}
        </p>

        {error && <p className="form-error">{error}</p>}

        <Button
          variant="primary"
          size="lg"
          loading={loading}
          onClick={handleReactivate}
          className="form-submit"
        >
          {t.reactivate.confirm}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleDecline}
          disabled={loading}
          className="form-submit"
        >
          {t.reactivate.decline}
        </Button>
      </div>
    </Modal>
  )
}
