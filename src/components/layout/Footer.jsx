import { Link } from 'react-router-dom'
import { useI18n } from '../../contexts/I18nContext'
import './Footer.css'

const SOCIAL_LINKS = [
  { label: 'Twitter / X', href: '#', img: 'xlogo.jpg' },
  { label: 'Discord',     href: 'https://discord.gg/utAsnpjVjA', img: 'Discordlogo.png' },
  { label: 'Instagram',   href: '#', img: 'Instagramlogo.png' },
  { label: 'TikTok',      href: '#', img: 'tiktoklogo.jpg' },
  { label: 'YouTube',     href: '#', img: 'youtubelogo.png' },
]

export default function Footer() {
  const { t } = useI18n()

  return (
    <footer className="footer">
      <div className="container footer-inner">
        <div className="footer-brand">
          <span className="footer-logo">AXWELD</span>
          <p className="footer-tagline">{t.footer.tagline}</p>
        </div>

        <nav className="footer-links" aria-label="Footer navigation">
          <Link to="/esport">{t.nav.esport}</Link>
          <Link to="/visual">{t.nav.visual}</Link>
          <Link to="/event">{t.nav.event}</Link>
          <Link to="/scrims">{t.nav.scrims}</Link>
        </nav>

        <div className="footer-socials">
          {SOCIAL_LINKS.map(({ label, href, img }) => (
            <a
              key={label}
              href={href}
              className="footer-social-btn"
              aria-label={label}
              target="_blank"
              rel="noopener noreferrer"
            >
              <img
                src={`${import.meta.env.BASE_URL}${img}`}
                alt={label}
                className="footer-social-icon"
              />
            </a>
          ))}
        </div>
      </div>

      <div className="footer-bottom container">
        <span>© {new Date().getFullYear()} AXWELD. {t.footer.rights}</span>
      </div>
    </footer>
  )
}
