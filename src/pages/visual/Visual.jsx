import { useState } from 'react'
import { useI18n } from '../../contexts/I18nContext'
import Card from '../../components/ui/Card'
import './Visual.css'

const TAGS = ['All', 'Branding', 'Apparel', 'Social Media', 'Banner', 'UI/UX', 'Print']

export default function Visual() {
  const { t } = useI18n()
  const [activeTag, setActiveTag] = useState('All')

  const works = t.visual.works.map((w, i) => ({ ...w, id: i + 1, date: ['2025-05', '2025-04', '2025-04', '2025-03', '2025-03', '2025-02'][i] }))
  const filtered = activeTag === 'All' ? works : works.filter((w) => w.type === activeTag)

  const allLabel = t.visual.all

  return (
    <div className="page container">
      <p className="section-label">{t.visual.label}</p>
      <h1 className="section-title">{t.visual.title}</h1>
      <div className="divider" />
      <p className="visual-intro">{t.visual.intro}</p>

      <div className="visual-tags">
        {TAGS.map((tag) => (
          <button
            key={tag}
            className={`visual-tag ${activeTag === tag ? 'active' : ''}`}
            onClick={() => setActiveTag(tag)}
          >
            {tag === 'All' ? allLabel : tag}
          </button>
        ))}
      </div>

      <div className="visual-grid">
        {filtered.map((work) => (
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
