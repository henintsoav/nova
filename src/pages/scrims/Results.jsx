import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useI18n } from '../../contexts/I18nContext'
import { getAccessibleGames, canManageResults } from '../../lib/roles'
import { postScrimResult } from '../../lib/discord'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'

const GAME_LABELS = { lol: 'League of Legends', wildrift: 'Wild Rift', valorant: 'Valorant' }
const RESULT_BADGE = { win: 'badge-success', loss: 'badge-danger' }

const EMPTY_FORM = { result: '', duration: '', players_present: '', champions: '', coach_note: '' }

export default function Results() {
  const { profile }  = useAuth()
  const { t }        = useI18n()
  const role         = profile?.role
  const canEdit      = canManageResults(role)
  const accessible   = getAccessibleGames(role)

  const [scrims,   setScrims]   = useState([])
  const [loading,  setLoading]  = useState(true)
  const [selected, setSelected] = useState(null)
  const [form,     setForm]     = useState(EMPTY_FORM)
  const [saving,   setSaving]   = useState(false)

  useEffect(() => { fetchResults() }, [accessible.join(',')])

  async function fetchResults() {
    setLoading(true)
    let query = supabase
      .from('scrims')
      .select('*')
      .eq('status', 'completed')
      .order('date', { ascending: false })

    if (accessible.length > 0 && accessible.length < 3) {
      query = query.in('game', accessible)
    }

    const { data } = await query
    setScrims(data ?? [])
    setLoading(false)
  }

  function openDetail(scrim) {
    setSelected(scrim)
    setForm({
      result:          scrim.result          ?? '',
      duration:        scrim.duration        ?? '',
      players_present: scrim.players_present ?? '',
      champions:       scrim.champions       ?? '',
      coach_note:      scrim.coach_note      ?? '',
    })
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    await supabase.from('scrims').update({
      result:          form.result          || null,
      duration:        form.duration        || null,
      players_present: form.players_present || null,
      champions:       form.champions       || null,
      coach_note:      form.coach_note      || null,
    }).eq('id', selected.id)

    // Post to Discord if a result was set
    if (form.result) {
      await postScrimResult({ scrim: selected, form })
    }

    setSaving(false)
    setSelected(null)
    fetchResults()
  }

  function field(key, value) { setForm((f) => ({ ...f, [key]: value })) }

  // Members see only scrims with a result; coaches/staff/founder see all completed
  const rows = canEdit
    ? scrims
    : scrims.filter((s) => s.result === 'win' || s.result === 'loss')

  if (loading) return <p className="scrims-loading">{t.common.loading}</p>

  return (
    <div>
      <div className="scrims-toolbar">
        <h2 className="scrims-section-title">{t.game.schedule}</h2>
      </div>

      {rows.length === 0 ? (
        <Card className="scrims-empty">
          <p>{t.results.empty}</p>
        </Card>
      ) : (
        <Card>
          <table className="schedule-table">
            <thead>
              <tr>
                <th>{t.game.date}</th>
                <th>{t.schedule.f_game}</th>
                <th>{t.game.opponent}</th>
                <th>{t.game.format}</th>
                <th>{t.game.status}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.id} className="result-row" onClick={() => openDetail(s)}>
                  <td>{s.date}</td>
                  <td>{GAME_LABELS[s.game]}</td>
                  <td>{s.opponent || '—'}</td>
                  <td>{s.format?.toUpperCase()}</td>
                  <td>
                    {s.result ? (
                      <span className={`badge ${RESULT_BADGE[s.result]}`}>
                        {t.game[s.result]}
                      </span>
                    ) : (
                      <span className="badge badge-warning">{t.results.pending}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? `${GAME_LABELS[selected?.game]} · ${selected?.opponent || '—'}` : ''}
      >
        {selected && (canEdit ? (
          /* ── Edit form (coach / staff / founder) ── */
          <form className="scrim-form" onSubmit={handleSave}>
            <div className="scrim-form-row">
              <div className="form-group">
                <label className="form-label">{t.results.f_result}</label>
                <select className="form-input" value={form.result}
                  onChange={(e) => field('result', e.target.value)}>
                  <option value="">— {t.results.no_result} —</option>
                  <option value="win">{t.game.win}</option>
                  <option value="loss">{t.game.loss}</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">{t.results.f_duration}</label>
                <input className="form-input" value={form.duration}
                  onChange={(e) => field('duration', e.target.value)}
                  placeholder="45 min" />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">{t.results.f_players}</label>
              <input className="form-input" value={form.players_present}
                onChange={(e) => field('players_present', e.target.value)}
                placeholder="StarForge, VoidWalker, …" />
            </div>
            <div className="form-group">
              <label className="form-label">{t.results.f_champions}</label>
              <input className="form-input" value={form.champions}
                onChange={(e) => field('champions', e.target.value)}
                placeholder="Yone, Graves, Viktor, …" />
            </div>
            <div className="form-group">
              <label className="form-label">{t.results.f_note}</label>
              <textarea className="form-input form-textarea" value={form.coach_note}
                onChange={(e) => field('coach_note', e.target.value)}
                rows={3} placeholder={t.results.note_ph} />
            </div>
            <Button type="submit" loading={saving} className="form-submit">
              {t.results.save}
            </Button>
          </form>
        ) : (
          /* ── Read-only detail (members) ── */
          <div className="result-detail">
            <div className="result-detail-header">
              <div>
                <p className="result-detail-opponent">
                  {t.results.vs} {selected.opponent || '—'}
                </p>
                <p className="result-detail-meta">
                  {selected.format?.toUpperCase()} · {selected.date}
                </p>
              </div>
              {selected.result && (
                <span className={`badge result-badge-lg ${RESULT_BADGE[selected.result]}`}>
                  {t.game[selected.result]}
                </span>
              )}
            </div>

            {selected.duration && (
              <div className="result-detail-row">
                <span className="result-detail-label">{t.results.f_duration}</span>
                <span>{selected.duration}</span>
              </div>
            )}
            {selected.players_present && (
              <div className="result-detail-row">
                <span className="result-detail-label">{t.results.f_players}</span>
                <span>{selected.players_present}</span>
              </div>
            )}
            {selected.champions && (
              <div className="result-detail-row">
                <span className="result-detail-label">{t.results.f_champions}</span>
                <span>{selected.champions}</span>
              </div>
            )}
            {selected.coach_note && (
              <div className="result-detail-row result-detail-note">
                <span className="result-detail-label">{t.results.f_note}</span>
                <p>{selected.coach_note}</p>
              </div>
            )}
          </div>
        ))}
      </Modal>
    </div>
  )
}
