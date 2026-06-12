import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useI18n } from '../../contexts/I18nContext'
import { getRoleGame, getAccessibleGames, canCreateProposal, isStaff } from '../../lib/roles'
import { postNewProposal } from '../../lib/discord'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import './Proposals.css'

const GAME_LABELS = { lol: 'LoL', wildrift: 'Wild Rift', valorant: 'Valorant' }

const STATUS_BADGE = {
  open:      'badge-accent',
  confirmed: 'badge-success',
  cancelled: 'badge-danger',
}

const EMPTY_FORM = {
  game: 'lol', proposed_date: '', proposed_time: '',
  opponent: '', format: 'bo1', min_players: 5, notes: '',
}

export default function Proposals() {
  const { user, profile }  = useAuth()
  const { t }              = useI18n()
  const role               = profile?.role
  const canCreate          = canCreateProposal(role)
  const accessibleGames    = getAccessibleGames(role)

  const [proposals, setProposals]   = useState([])
  const [responses, setResponses]   = useState({}) // { proposalId: 'accepted'|'declined' }
  const [allResponses, setAllResp]  = useState([]) // all rows
  const [loading, setLoading]       = useState(true)
  const [formOpen, setFormOpen]     = useState(false)
  const [form, setForm]             = useState({ ...EMPTY_FORM, game: accessibleGames[0] ?? 'lol' })
  const [saving, setSaving]         = useState(false)
  const [saveError, setSaveError]   = useState(null)
  const [actionId, setActionId]     = useState(null)
  const [toast, setToast]           = useState(null)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)

    // Auto-cancel expired open proposals before fetching
    const now = new Date()
    const { data: open } = await supabase
      .from('scrim_proposals')
      .select('id, proposed_date, proposed_time')
      .eq('status', 'open')

    const expiredIds = (open ?? [])
      .filter(p => new Date(`${p.proposed_date}T${p.proposed_time}`) < now)
      .map(p => p.id)

    if (expiredIds.length > 0) {
      await supabase
        .from('scrim_proposals')
        .update({ status: 'cancelled' })
        .in('id', expiredIds)
    }

    const { data: props } = await supabase
      .from('scrim_proposals')
      .select('*')
      .order('proposed_date', { ascending: true })
    setProposals(props ?? [])

    const { data: resp } = await supabase
      .from('proposal_responses')
      .select('*')
    setAllResp(resp ?? [])

    // My responses map
    const mine = {}
    for (const r of resp ?? []) {
      if (r.user_id === user.id) mine[r.proposal_id] = r.response
    }
    setResponses(mine)
    setLoading(false)
  }

  function acceptanceCount(proposalId) {
    return allResponses.filter((r) => r.proposal_id === proposalId && r.response === 'accepted').length
  }

  async function respond(proposal, response) {
    setActionId(proposal.id)
    await supabase.from('proposal_responses').upsert(
      { proposal_id: proposal.id, user_id: user.id, response },
      { onConflict: 'proposal_id,user_id' }
    )

    setResponses((prev) => ({ ...prev, [proposal.id]: response }))

    // Refresh all responses to get updated count
    const { data: resp } = await supabase.from('proposal_responses').select('*')
    setAllResp(resp ?? [])

    // Auto-confirm if threshold reached
    const accepted = (resp ?? []).filter(
      (r) => r.proposal_id === proposal.id && r.response === 'accepted'
    ).length

    if (response === 'accepted' && accepted >= proposal.min_players && proposal.status === 'open') {
      await autoConfirm(proposal)
    }

    setActionId(null)
  }

  async function autoConfirm(proposal) {
    // Create confirmed scrim
    await supabase.from('scrims').insert({
      title: proposal.opponent ? `Scrim vs ${proposal.opponent}` : 'Scrim',
      game: proposal.game,
      date: proposal.proposed_date,
      time: proposal.proposed_time,
      opponent: proposal.opponent,
      format: proposal.format,
      status: 'confirmed',
      notes: proposal.notes,
      created_by: user.id,
    })
    // Update proposal status
    await supabase.from('scrim_proposals').update({ status: 'confirmed' }).eq('id', proposal.id)
    setProposals((prev) => prev.map((p) => p.id === proposal.id ? { ...p, status: 'confirmed' } : p))
    showToast(t.proposals.auto_confirmed)
  }

  async function cancelProposal(id) {
    await supabase.from('scrim_proposals').update({ status: 'cancelled' }).eq('id', id)
    setProposals((prev) => prev.map((p) => p.id === id ? { ...p, status: 'cancelled' } : p))
  }

  async function handleCreate(e) {
    e.preventDefault()
    setSaving(true)
    setSaveError(null)
    const { error } = await supabase.from('scrim_proposals').insert({ ...form, created_by: user.id })
    setSaving(false)
    if (error) {
      setSaveError(error.message)
      return
    }
    await postNewProposal(form)
    setFormOpen(false)
    await fetchAll()
  }

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const statusLabel = (s) => t.proposals[`status_${s}`] ?? s
  const myResponse  = (id) => responses[id] ?? null

  if (loading) return <p className="scrims-loading">{t.common.loading}</p>

  return (
    <div>
      <div className="scrims-toolbar">
        <h2 className="scrims-section-title">{t.proposals.title}</h2>
        {canCreate && (
          <Button size="sm" onClick={() => setFormOpen(true)}>{t.proposals.new}</Button>
        )}
      </div>

      {toast && <div className="proposals-toast">{toast}</div>}

      {proposals.length === 0 ? (
        <Card className="scrims-empty"><p>{t.proposals.empty}</p></Card>
      ) : (
        <div className="proposals-list">
          {proposals.map((p) => {
            const accepted  = acceptanceCount(p.id)
            const myResp    = myResponse(p.id)
            const isPast    = p.status !== 'open'
            const isMine    = p.created_by === user.id
            const isPlayer  = role?.startsWith('member_')

            return (
              <Card key={p.id} className={`proposal-card ${isPast ? 'proposal-past' : ''}`} glow={!isPast}>
                <div className="proposal-header">
                  <div className="proposal-title-row">
                    <h3 className="proposal-title">
                      {p.opponent ? `${t.proposals.vs} ${p.opponent}` : 'Scrim'}
                    </h3>
                    <div className="proposal-badges">
                      <span className="badge badge-primary">{GAME_LABELS[p.game]}</span>
                      <span className="badge badge-primary">{p.format.toUpperCase()}</span>
                      <span className={`badge ${STATUS_BADGE[p.status]}`}>{statusLabel(p.status)}</span>
                    </div>
                  </div>
                  <div className="proposal-meta">
                    <span>📅 {new Date(p.proposed_date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                    <span>🕐 {p.proposed_time?.slice(0, 5)}</span>
                    {p.notes && <span className="proposal-notes">{p.notes}</span>}
                  </div>
                </div>

                {/* Acceptance bar */}
                <div className="proposal-acceptance">
                  <div className="acceptance-pips">
                    {Array.from({ length: p.min_players }, (_, i) => (
                      <span key={i} className={`acceptance-pip ${i < accepted ? 'filled' : ''}`} />
                    ))}
                  </div>
                  <span className="acceptance-label">
                    {accepted}/{p.min_players} {t.proposals.players_accepted}
                  </span>
                </div>

                {/* Actions */}
                <div className="proposal-actions">
                  {isPlayer && p.status === 'open' && (
                    <>
                      <button
                        className={`proposal-btn accept ${myResp === 'accepted' ? 'active' : ''}`}
                        onClick={() => respond(p, 'accepted')}
                        disabled={actionId === p.id}
                      >
                        ✓ {t.proposals.accept}
                      </button>
                      <button
                        className={`proposal-btn decline ${myResp === 'declined' ? 'active' : ''}`}
                        onClick={() => respond(p, 'declined')}
                        disabled={actionId === p.id}
                      >
                        ✕ {t.proposals.decline}
                      </button>
                    </>
                  )}
                  {myResp && (
                    <span className={`proposal-my-resp ${myResp}`}>
                      {t.proposals[myResp]}
                    </span>
                  )}
                  {canCreate && (isMine || isStaff(role)) && p.status === 'open' && (
                    <button className="proposal-btn cancel" onClick={() => cancelProposal(p.id)}>
                      {t.proposals.cancel}
                    </button>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Create proposal modal */}
      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={t.proposals.modal_title}>
        <form className="scrim-form" onSubmit={handleCreate}>
          <div className="form-group">
            <label className="form-label">{t.proposals.f_game}</label>
            <select className="form-input" value={form.game}
              onChange={(e) => setForm({ ...form, game: e.target.value })}>
              {accessibleGames.map((g) => (
                <option key={g} value={g}>{GAME_LABELS[g]}</option>
              ))}
            </select>
          </div>
          <div className="scrim-form-row">
            <div className="form-group">
              <label className="form-label">{t.proposals.f_date}</label>
              <input className="form-input" type="date" required value={form.proposed_date}
                onChange={(e) => setForm({ ...form, proposed_date: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">{t.proposals.f_time}</label>
              <input className="form-input" type="time" required value={form.proposed_time}
                onChange={(e) => setForm({ ...form, proposed_time: e.target.value })} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">{t.proposals.f_opponent}</label>
            <input className="form-input" value={form.opponent}
              onChange={(e) => setForm({ ...form, opponent: e.target.value })}
              placeholder="Team name" />
          </div>
          <div className="scrim-form-row">
            <div className="form-group">
              <label className="form-label">{t.proposals.f_format}</label>
              <select className="form-input" value={form.format}
                onChange={(e) => setForm({ ...form, format: e.target.value })}>
                <option value="bo1">Bo1</option>
                <option value="bo3">Bo3</option>
                <option value="bo5">Bo5</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">{t.proposals.f_min_players}</label>
              <input className="form-input" type="number" min={1} max={10}
                value={form.min_players}
                onChange={(e) => setForm({ ...form, min_players: Number(e.target.value) })} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">{t.proposals.f_notes}</label>
            <textarea className="form-input form-textarea" value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} />
          </div>
          {saveError && <p className="form-error">{saveError}</p>}
          <Button type="submit" loading={saving} className="form-submit">
            {t.proposals.create}
          </Button>
        </form>
      </Modal>
    </div>
  )
}
