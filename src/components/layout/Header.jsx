import { useState } from 'react'
import { NavLink, Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useI18n } from '../../contexts/I18nContext'
import LoginForm from '../auth/LoginForm'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import './Header.css'

export default function Header() {
  const { user, profile, signOut } = useAuth()
  const { t, lang, switchLang }    = useI18n()
  const [authOpen, setAuthOpen]    = useState(false)
  const [menuOpen, setMenuOpen]    = useState(false)

  const NAV_LINKS = [
    { label: t.nav.esport, to: '/esport' },
    { label: t.nav.visual, to: '/visual' },
    { label: t.nav.event,  to: '/event' },
  ]

  function handleSignOut() {
    signOut()
    setMenuOpen(false)
  }

  return (
    <>
      <header className="header">
        <div className="header-inner container">

          {/* Left — nav */}
          <nav className="header-nav" aria-label="Main navigation">
            {NAV_LINKS.map(({ label, to }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) => `header-nav-link ${isActive ? 'active' : ''}`}
              >
                {label}
              </NavLink>
            ))}
          </nav>

          {/* Center — logo */}
          <Link to="/" className="header-logo" aria-label="NOVA home">
            NOVA
          </Link>

          {/* Right — lang switcher + auth */}
          <div className="header-auth">
            <div className="lang-switcher" aria-label="Language switcher">
              <button
                className={`lang-btn ${lang === 'fr' ? 'active' : ''}`}
                onClick={() => switchLang('fr')}
              >
                FR
              </button>
              <span className="lang-divider" aria-hidden>·</span>
              <button
                className={`lang-btn ${lang === 'en' ? 'active' : ''}`}
                onClick={() => switchLang('en')}
              >
                EN
              </button>
            </div>

            {user ? (
              <div className="header-user">
                <button
                  className="header-avatar-btn"
                  onClick={() => setMenuOpen(v => !v)}
                  aria-label="User menu"
                >
                  <span className="header-avatar">
                    {profile?.display_name?.[0]?.toUpperCase() ?? '?'}
                  </span>
                  <span className="header-username">{profile?.display_name}</span>
                </button>
                {menuOpen && (
                  <div className="header-dropdown">
                    <NavLink to="/scrims" className="dropdown-item" onClick={() => setMenuOpen(false)}>
                      {t.nav.scrims}
                    </NavLink>
                    <button className="dropdown-item danger" onClick={handleSignOut}>
                      {t.nav.logout}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Button size="sm" onClick={() => setAuthOpen(true)}>
                {t.nav.login}
              </Button>
            )}
          </div>

        </div>
      </header>

      <Modal open={authOpen} onClose={() => setAuthOpen(false)} title={t.auth.modal_title}>
        <LoginForm onSuccess={() => setAuthOpen(false)} />
      </Modal>
    </>
  )
}
