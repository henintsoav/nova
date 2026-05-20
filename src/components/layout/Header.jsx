import { useState } from 'react'
import { NavLink, Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import LoginForm from '../auth/LoginForm'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import './Header.css'

const NAV_LINKS = [
  { label: 'ESPORT', to: '/esport' },
  { label: 'VISUAL', to: '/visual' },
  { label: 'EVENT',  to: '/event' },
]

export default function Header() {
  const { user, profile, signOut } = useAuth()
  const [authOpen, setAuthOpen]   = useState(false)
  const [menuOpen, setMenuOpen]   = useState(false)

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

          {/* Right — auth */}
          <div className="header-auth">
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
                      Scrims
                    </NavLink>
                    <button className="dropdown-item danger" onClick={handleSignOut}>
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Button size="sm" onClick={() => setAuthOpen(true)}>
                Login
              </Button>
            )}
          </div>

        </div>
      </header>

      <Modal open={authOpen} onClose={() => setAuthOpen(false)} title="Welcome back">
        <LoginForm onSuccess={() => setAuthOpen(false)} />
      </Modal>
    </>
  )
}
