import { useI18n } from '../../contexts/I18nContext'
import Card from '../../components/ui/Card'
import './Event.css'

const TYPE_KEY = { tournament: 'type_tournament', scrim: 'type_scrim', session: 'type_session' }
const STATUS_BADGE = { upcoming: 'badge-accent', past: 'badge-primary' }

export default function Event() {
  const { t } = useI18n()

  const events   = t.event.events
  const upcoming = events.filter((e) => e.status === 'upcoming')
  const past     = events.filter((e) => e.status === 'past')

  return (
    <div className="page container">
      <p className="section-label">{t.event.label}</p>
      <h1 className="section-title">{t.event.title}</h1>
      <div className="divider" />

      <section className="event-section">
        <h2 className="event-section-heading">{t.event.upcoming}</h2>
        <div className="event-list">
          {upcoming.map((ev, i) => <EventCard key={i} event={ev} t={t} />)}
        </div>
      </section>

      {past.length > 0 && (
        <section className="event-section">
          <h2 className="event-section-heading">{t.event.past}</h2>
          <div className="event-list">
            {past.map((ev, i) => <EventCard key={i} event={ev} t={t} past />)}
          </div>
        </section>
      )}
    </div>
  )
}

function EventCard({ event, t, past = false }) {
  const dateObj = new Date(event.date)
  const day     = dateObj.toLocaleDateString('fr-FR', { day: '2-digit' })
  const month   = dateObj.toLocaleDateString('fr-FR', { month: 'short' })
  const statusLabel = past ? t.event.past_badge : t.event.upcoming_badge
  const typeLabel   = t.event[TYPE_KEY[event.type]] ?? event.type

  return (
    <Card className={`event-card ${past ? 'event-card-past' : ''}`} glow={!past}>
      <div className="event-date-block">
        <span className="event-day">{day}</span>
        <span className="event-month">{month}</span>
      </div>
      <div className="event-info">
        <div className="event-badges">
          <span className={`badge ${STATUS_BADGE[event.status]}`}>{statusLabel}</span>
          <span className="badge badge-primary">{typeLabel}</span>
          <span className="badge badge-primary">{event.game}</span>
        </div>
        <h3 className="event-title">{event.title}</h3>
        <p className="event-desc">{event.desc}</p>
        <div className="event-meta">
          <span>🕐 {event.time}</span>
          <span>📍 {event.location}</span>
        </div>
      </div>
    </Card>
  )
}
