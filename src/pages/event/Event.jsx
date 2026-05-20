import Card from '../../components/ui/Card'
import './Event.css'

const EVENTS = [
  {
    id: 1,
    title: 'NOVA Spring Invitational',
    date: '2025-06-15',
    time: '14:00',
    location: 'Online — Discord',
    game: 'All',
    type: 'Tournament',
    status: 'upcoming',
    description: 'Internal invitational tournament across all three NOVA divisions.',
  },
  {
    id: 2,
    title: 'Wild Rift Scrim Night',
    date: '2025-06-08',
    time: '20:00',
    location: 'Online',
    game: 'Wild Rift',
    type: 'Scrim',
    status: 'upcoming',
    description: 'Weekly scrim block for the Wild Rift roster.',
  },
  {
    id: 3,
    title: 'Valorant Community Cup',
    date: '2025-07-01',
    time: '18:00',
    location: 'Online — Faceit',
    game: 'Valorant',
    type: 'Tournament',
    status: 'upcoming',
    description: 'Open registration community event — spectators welcome.',
  },
  {
    id: 4,
    title: 'LoL Team Review Session',
    date: '2025-05-18',
    time: '19:00',
    location: 'Online — Discord',
    game: 'League of Legends',
    type: 'Session',
    status: 'past',
    description: 'VOD review and strategy session for the LoL roster.',
  },
]

const STATUS_CLASSES = {
  upcoming: 'badge-accent',
  past: 'badge-primary',
}

export default function Event() {
  const upcoming = EVENTS.filter((e) => e.status === 'upcoming')
  const past      = EVENTS.filter((e) => e.status === 'past')

  return (
    <div className="page container">
      <p className="section-label">Calendar</p>
      <h1 className="section-title">Events</h1>
      <div className="divider" />

      <section className="event-section">
        <h2 className="event-section-heading">Upcoming</h2>
        <div className="event-list">
          {upcoming.map((ev) => <EventCard key={ev.id} event={ev} />)}
        </div>
      </section>

      {past.length > 0 && (
        <section className="event-section">
          <h2 className="event-section-heading">Past</h2>
          <div className="event-list">
            {past.map((ev) => <EventCard key={ev.id} event={ev} past />)}
          </div>
        </section>
      )}
    </div>
  )
}

function EventCard({ event, past = false }) {
  const dateObj = new Date(event.date)
  const day     = dateObj.toLocaleDateString('en-US', { day: '2-digit' })
  const month   = dateObj.toLocaleDateString('en-US', { month: 'short' })

  return (
    <Card className={`event-card ${past ? 'event-card-past' : ''}`} glow={!past}>
      <div className="event-date-block">
        <span className="event-day">{day}</span>
        <span className="event-month">{month}</span>
      </div>
      <div className="event-info">
        <div className="event-badges">
          <span className={`badge ${STATUS_CLASSES[event.status]}`}>{event.status}</span>
          <span className="badge badge-primary">{event.type}</span>
          <span className="badge badge-primary">{event.game}</span>
        </div>
        <h3 className="event-title">{event.title}</h3>
        <p className="event-desc">{event.description}</p>
        <div className="event-meta">
          <span>🕐 {event.time}</span>
          <span>📍 {event.location}</span>
        </div>
      </div>
    </Card>
  )
}
