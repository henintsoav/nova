import { Link } from 'react-router-dom'
import './Footer.css'

const SOCIAL_LINKS = [
  { label: 'Twitter / X', href: '#', icon: 'X' },
  { label: 'Discord',     href: '#', icon: 'DC' },
  { label: 'Instagram',   href: '#', icon: 'IG' },
  { label: 'Twitch',      href: '#', icon: 'TW' },
  { label: 'YouTube',     href: '#', icon: 'YT' },
]

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <div className="footer-brand">
          <span className="footer-logo">NOVA</span>
          <p className="footer-tagline">Competitive excellence, every match.</p>
        </div>

        <nav className="footer-links" aria-label="Footer navigation">
          <Link to="/esport">Esport</Link>
          <Link to="/visual">Visual</Link>
          <Link to="/event">Event</Link>
          <Link to="/scrims">Scrims</Link>
        </nav>

        <div className="footer-socials">
          {SOCIAL_LINKS.map(({ label, href, icon }) => (
            <a
              key={label}
              href={href}
              className="footer-social-btn"
              aria-label={label}
              target="_blank"
              rel="noopener noreferrer"
            >
              {icon}
            </a>
          ))}
        </div>
      </div>

      <div className="footer-bottom container">
        <span>© {new Date().getFullYear()} NOVA. All rights reserved.</span>
      </div>
    </footer>
  )
}
