import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { isFounder } from '../../lib/roles'
import Button from '../ui/Button'
import Modal from '../ui/Modal'

const RESULT_LABELS = { win: 'Victoire', loss: 'Défaite', draw: 'Nul' }
const RESULT_COLORS = { win: '#10B981', loss: '#ef4444', draw: '#9CA3AF' }

const EMPTY_FORM = {
  opponent:    '',
  score:       '',
  result:      'win',
  competition: '',
  played_at:   new Date().toISOString().split('T')[0],
}

export default function MatchResults({ game }) {
  const { profile } = useAuth()
  const founder = isFounder(profile?.role)

  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [form, setForm]       = useState({ ...EMPTY_FORM })
  const [saving, setSaving]   = useState(false)

  useEffect(() => { fetchResults() }, [game])

  async function fetchResults() {
    setLoading(true)
    const { data } = await supabase
      .from('match_results')
      .select('*')
      .eq('game', game)
      .order('played_at', { ascending: false })
    setResults(data ?? [])
    setLoading(false)
  }

  function f(field, val) { setForm(prev => ({ ...prev, [field]: val })) }

  async function handleAdd(e) {
    e.preventDefault()
    setSaving(true)
    await supabase.from('match_results').insert({ ...form, game })
    setSaving(false)
    setAddOpen(false)
    setForm({ ...EMPTY_FORM })
    fetchResults()
  }

  async function handleDelete(id) {
    if (!confirm('Supprimer ce résultat ?')) return
    await supabase.from('match_results').delete().eq('id', id)
    setResults(prev => prev.filter(r => r.id !== id))
  }

  if (loading) return <p className="roster-empty">Chargement…</p>

  return (
    <>
      {founder && (
        <div className="roster-toolbar">
          <Button size="sm" onClick={() => { setForm({ ...EMPTY_FORM }); setAddOpen(true) }}>
            + Ajouter un résultat
          </Button>
        </div>
      )}

      {results.length === 0 ? (
        <p className="roster-empty">Aucun résultat enregistré pour le moment.</p>
      ) : (
        <div className="match-results-list">
          {results.map(r => (
            <div key={r.id} className="match-result-row">
              <span className="match-result-date">
                {new Date(r.played_at + 'T12:00:00').toLocaleDateString('fr-FR', {
                  day: '2-digit', month: 'short', year: 'numeric',
                })}
              </span>

              <div className="match-result-info">
                <span className="match-result-opponent">vs {r.opponent}</span>
                {r.competition && (
                  <span className="match-result-competition">{r.competition}</span>
                )}
              </div>

              {r.score && <span className="match-result-score">{r.score}</span>}

              <span
                className="match-result-badge"
                style={{
                  color:       RESULT_COLORS[r.result],
                  background:  `${RESULT_COLORS[r.result]}18`,
                  borderColor: `${RESULT_COLORS[r.result]}44`,
                }}
              >
                {RESULT_LABELS[r.result]}
              </span>

              {founder && (
                <button
                  className="match-result-delete"
                  onClick={() => handleDelete(r.id)}
                  title="Supprimer"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Ajouter un résultat">
        <form onSubmit={handleAdd}>
          <div className="form-group">
            <label className="form-label">Adversaire *</label>
            <input
              className="form-input"
              required
              value={form.opponent}
              onChange={e => f('opponent', e.target.value)}
              placeholder="Nom de l'équipe adverse"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Résultat *</label>
            <select className="form-input" value={form.result} onChange={e => f('result', e.target.value)} required>
              <option value="win">Victoire</option>
              <option value="loss">Défaite</option>
              <option value="draw">Nul</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Score (ex : 2-1)</label>
            <input
              className="form-input"
              value={form.score}
              onChange={e => f('score', e.target.value)}
              placeholder="2-1"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Compétition / Tournoi</label>
            <input
              className="form-input"
              value={form.competition}
              onChange={e => f('competition', e.target.value)}
              placeholder="Ex : Tournoi Spring 2026"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Date *</label>
            <input
              className="form-input"
              type="date"
              required
              value={form.played_at}
              onChange={e => f('played_at', e.target.value)}
            />
          </div>

          <Button type="submit" loading={saving} style={{ marginTop: 8 }}>
            Enregistrer
          </Button>
        </form>
      </Modal>
    </>
  )
}
