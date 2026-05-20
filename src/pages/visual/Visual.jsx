import Card from '../../components/ui/Card'
import './Visual.css'

const WORKS = [
  { id: 1, title: 'NOVA Brand Identity',       type: 'Branding',     date: '2025-05' },
  { id: 2, title: 'LoL Team Jersey Design',     type: 'Apparel',      date: '2025-04' },
  { id: 3, title: 'Valorant Match Thumbnail',   type: 'Social Media', date: '2025-04' },
  { id: 4, title: 'Wild Rift Season Banner',    type: 'Banner',       date: '2025-03' },
  { id: 5, title: 'Discord Server Layout',      type: 'UI/UX',        date: '2025-03' },
  { id: 6, title: 'Event Poster — Spring Cup',  type: 'Print',        date: '2025-02' },
]

const TAGS = ['All', 'Branding', 'Apparel', 'Social Media', 'Banner', 'UI/UX', 'Print']

export default function Visual() {
  return (
    <div className="page container">
      <p className="section-label">Creative Team</p>
      <h1 className="section-title">Visual</h1>
      <div className="divider" />
      <p className="visual-intro">
        Our visual team crafts the identity behind every NOVA appearance — from team jerseys to social banners.
      </p>

      <div className="visual-tags">
        {TAGS.map((tag) => (
          <button key={tag} className={`visual-tag ${tag === 'All' ? 'active' : ''}`}>
            {tag}
          </button>
        ))}
      </div>

      <div className="visual-grid">
        {WORKS.map((work) => (
          <Card key={work.id} className="visual-card" glow>
            <div className="visual-card-preview">
              <span className="visual-card-type-icon">✦</span>
            </div>
            <div className="visual-card-info">
              <span className="badge badge-primary">{work.type}</span>
              <h3 className="visual-card-title">{work.title}</h3>
              <span className="visual-card-date">{work.date}</span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
