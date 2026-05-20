import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useI18n } from '../../contexts/I18nContext'
import { getRoleGame, isCoachOrStaff, getAccessibleGames } from '../../lib/roles'
import Card from '../../components/ui/Card'
import './WeeklyAvailability.css'

// Display hours: 14:00 → 24:00
const HOURS = Array.from({ length: 11 }, (_, i) => i + 14)  // [14,15,...,24]
const DAYS  = 7  // Mon(0) → Sun(6)

export default function WeeklyAvailability() {
  const { user, profile } = useAuth()
  const { t }             = useI18n()

  const role         = profile?.role
  const isCoach      = isCoachOrStaff(role)
  const games        = getAccessibleGames(role)
  const [game, setGame] = useState(games[0] ?? 'lol')

  // mySlots: Set of "day-hour" strings for quick lookup
  const [mySlots, setMySlots]     = useState(new Set())
  // allSlots: { "day-hour": count } for aggregate view
  const [allSlots, setAllSlots]   = useState({})
  const [teamSize, setTeamSize]   = useState(0)
  const [loading, setLoading]     = useState(true)
  const [saving, setSaving]       = useState(false)
  const [savedMsg, setSavedMsg]   = useState(false)

  const fetchSlots = useCallback(async () => {
    setLoading(true)

    // Fetch own slots
    const { data: own } = await supabase
      .from('weekly_slots')
      .select('day_of_week, hour')
      .eq('user_id', user.id)
      .eq('game', game)

    const ownSet = new Set((own ?? []).map((s) => `${s.day_of_week}-${s.hour}`))
    setMySlots(ownSet)

    // Fetch all slots for aggregate
    const { data: all } = await supabase
      .from('weekly_slots')
      .select('day_of_week, hour, user_id')
      .eq('game', game)

    const counts = {}
    const uniqueUsers = new Set()
    for (const s of all ?? []) {
      const key = `${s.day_of_week}-${s.hour}`
      counts[key] = (counts[key] ?? 0) + 1
      uniqueUsers.add(s.user_id)
    }
    setAllSlots(counts)
    setTeamSize(uniqueUsers.size || 5)

    setLoading(false)
  }, [user.id, game])

  useEffect(() => { fetchSlots() }, [fetchSlots])

  async function toggleSlot(day, hour) {
    const key = `${day}-${hour}`
    const next = new Set(mySlots)

    if (next.has(key)) {
      next.delete(key)
      await supabase.from('weekly_slots').delete()
        .eq('user_id', user.id).eq('game', game)
        .eq('day_of_week', day).eq('hour', hour)
    } else {
      next.add(key)
      await supabase.from('weekly_slots').upsert(
        { user_id: user.id, game, day_of_week: day, hour },
        { onConflict: 'user_id,game,day_of_week,hour' }
      )
    }

    setMySlots(next)

    // Optimistic update aggregate
    setAllSlots((prev) => {
      const updated = { ...prev }
      if (mySlots.has(key)) {
        updated[key] = Math.max((updated[key] ?? 1) - 1, 0)
      } else {
        updated[key] = (updated[key] ?? 0) + 1
      }
      return updated
    })

    flashSaved()
  }

  function flashSaved() {
    setSavedMsg(true)
    setTimeout(() => setSavedMsg(false), 1500)
  }

  function cellClass(day, hour) {
    const key     = `${day}-${hour}`
    const isMine  = mySlots.has(key)
    const count   = allSlots[key] ?? 0
    const ratio   = teamSize > 0 ? count / teamSize : 0

    if (isMine && count >= teamSize && teamSize > 1) return 'slot slot-all'
    if (isMine) return 'slot slot-mine'
    if (count >= teamSize && teamSize > 1) return 'slot slot-all'
    if (ratio >= 0.6) return 'slot slot-high'
    if (ratio >= 0.3) return 'slot slot-medium'
    if (count > 0)    return 'slot slot-low'
    return 'slot'
  }

  const GAME_LABELS = { lol: 'League of Legends', wildrift: 'Wild Rift', valorant: 'Valorant' }

  return (
    <div>
      <div className="weekly-header">
        <div>
          <h2 className="scrims-section-title">{t.weekly.title}</h2>
          <p className="weekly-subtitle">{t.weekly.subtitle}</p>
        </div>
        <div className="weekly-header-right">
          {games.length > 1 && (
            <div className="weekly-game-tabs">
              {games.map((g) => (
                <button
                  key={g}
                  className={`weekly-game-tab ${game === g ? 'active' : ''}`}
                  onClick={() => setGame(g)}
                >
                  {GAME_LABELS[g]}
                </button>
              ))}
            </div>
          )}
          {savedMsg && <span className="weekly-saved">{t.weekly.saved}</span>}
        </div>
      </div>

      {loading ? (
        <p className="scrims-loading">{t.common.loading}</p>
      ) : (
        <Card className="weekly-card">
          <div className="weekly-grid-wrap">
            <table className="weekly-grid">
              <thead>
                <tr>
                  <th className="weekly-hour-label" />
                  {t.weekly.days.map((d, i) => (
                    <th key={i} className="weekly-day-label">{d}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {HOURS.map((hour) => (
                  <tr key={hour}>
                    <td className="weekly-hour-label">{hour}:00</td>
                    {Array.from({ length: DAYS }, (_, day) => {
                      const key   = `${day}-${hour}`
                      const count = allSlots[key] ?? 0
                      const isMine = mySlots.has(key)
                      return (
                        <td key={day}>
                          <button
                            className={cellClass(day, hour)}
                            onClick={() => toggleSlot(day, hour)}
                            title={
                              isCoach
                                ? `${count} ${t.weekly.players_available}`
                                : isMine ? t.weekly.your_slot : ''
                            }
                          >
                            {isCoach && count > 0 && (
                              <span className="slot-count">{count}</span>
                            )}
                          </button>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Legend */}
          <div className="weekly-legend">
            <span className="legend-item">
              <span className="slot slot-mine legend-swatch" /> {t.weekly.your_slot}
            </span>
            <span className="legend-item">
              <span className="slot slot-high legend-swatch" /> 60%+
            </span>
            <span className="legend-item">
              <span className="slot slot-all legend-swatch" /> {t.weekly.all_available}
            </span>
          </div>
        </Card>
      )}
    </div>
  )
}
