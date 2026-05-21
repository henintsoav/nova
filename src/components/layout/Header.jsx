import { useState, useEffect, useRef } from 'react'
import { NavLink, Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useI18n } from '../../contexts/I18nContext'
import { hasScrimAccess, isFounder } from '../../lib/roles'
import LoginForm from '../auth/LoginForm'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import './Header.css'

const SECTION_LINKS = (t) => [
  { label: t.nav.esport, to: '/esport' },
  { label: t.nav.visual, to: '/visual' },
  { label: t.nav.event,  to: '/event'  },
]

export default function Header() {
  const { user, profile, signOut } = useAuth()
  const { t, lang, switchLang }    = useI18n()
  const [authOpen, setAuthOpen]       = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [sectionsOpen, setSectionsOpen] = useState(false)
  const sectionsRef = useRef(null)

  useEffect(() => {
    if (!sectionsOpen) return
    function handleClick(e) {
      if (sectionsRef.current && !sectionsRef.current.contains(e.target)) {
        setSectionsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [sectionsOpen])

  function handleSignOut() {
    signOut()
    setUserMenuOpen(false)
  }

  const sectionLinks = SECTION_LINKS(t)

  return (
    <>
      <header className="header">
        <div className="header-inner container">

          {/* Left — sections dropdown */}
          <nav className="header-nav" aria-label="Main navigation">
            <div className="nav-sections" ref={sectionsRef}>
              <button
                className={`header-nav-link nav-sections-btn ${sectionsOpen ? 'open' : ''}`}
                onClick={() => setSectionsOpen(v => !v)}
                aria-expanded={sectionsOpen}
                aria-haspopup="true"
              >
                {t.nav.sections}
                <span className="nav-chevron" aria-hidden>▾</span>
              </button>

              {sectionsOpen && (
                <div className="nav-sections-dropdown">
                  {sectionLinks.map(({ label, to }) => (
                    <NavLink
                      key={to}
                      to={to}
                      className={({ isActive }) => `dropdown-item ${isActive ? 'active' : ''}`}
                      onClick={() => setSectionsOpen(false)}
                    >
                      {label}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
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
                  onClick={() => setUserMenuOpen(v => !v)}
                  aria-label="User menu"
                >
                  <span className="header-avatar">
                    {(profile?.pseudo || profile?.display_name)?.[0]?.toUpperCase() ?? '?'}
                  </span>
                  <span className="header-username">{profile?.pseudo || profile?.display_name}</span>
                </button>
                {userMenuOpen && (
                  <div className="header-dropdown">
                    <NavLink to="/profile" className="dropdown-item" onClick={() => setUserMenuOpen(false)}>
                      {t.nav.profile}
                    </NavLink>
                    {hasScrimAccess(profile?.role) && (
                      <NavLink to="/scrims" className="dropdown-item" onClick={() => setUserMenuOpen(false)}>
                        {t.nav.scrims}
                      </NavLink>
                    )}
                    {isFounder(profile?.role) && (
                      <NavLink to="/admin" className="dropdown-item" onClick={() => setUserMenuOpen(false)}>
                        {t.nav.admin}
                      </NavLink>
                    )}
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
