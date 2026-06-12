const WEBHOOK_URLS = {
  lol:      import.meta.env.VITE_DISCORD_WEBHOOK_LOL,
  wildrift: import.meta.env.VITE_DISCORD_WEBHOOK_WR,
  valorant: import.meta.env.VITE_DISCORD_WEBHOOK_VALO,
}

const WEBHOOK_PLANNING = {
  lol:      import.meta.env.VITE_DISCORD_WEBHOOK_PLANNING_LOL,
  wildrift: import.meta.env.VITE_DISCORD_WEBHOOK_PLANNING_WR,
  valorant: import.meta.env.VITE_DISCORD_WEBHOOK_PLANNING_VALO,
}

const NOTIFY_PROPOSAL_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/notify-proposal`
const SUPABASE_ANON_KEY   = import.meta.env.VITE_SUPABASE_ANON_KEY

const WEBHOOK_PROPOSALS = {
  lol:      import.meta.env.VITE_DISCORD_WEBHOOK_PROPOSALS_LOL,
  wildrift: import.meta.env.VITE_DISCORD_WEBHOOK_PROPOSALS_WR,
  valorant: import.meta.env.VITE_DISCORD_WEBHOOK_PROPOSALS_VALO,
}

const GAME_LABELS = {
  lol:       'League of Legends',
  wildrift:  'Wild Rift',
  valorant:  'Valorant',
}

const RESULT_COLORS = {
  win:  0x57F287, // green
  loss: 0xED4245, // red
}

async function postToWebhook(url, body) {
  if (!url) return
  try {
    await fetch(url, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    })
  } catch {
    // Never crash the app if Discord is unreachable
  }
}

/**
 * Post a new scrim to #planning when a coach creates one.
 */
export async function postScrimScheduled(form) {
  const fields = [
    { name: '🎮 Jeu',        value: GAME_LABELS[form.game] ?? form.game,  inline: true },
    { name: '📋 Format',     value: form.format?.toUpperCase() ?? '—',    inline: true },
    { name: '📆 Date',       value: form.date  || '—',                    inline: true },
    { name: '🕐 Heure',      value: form.time  || '—',                    inline: true },
  ]
  if (form.opponent) fields.push({ name: '⚔️ Adversaire', value: form.opponent, inline: true })
  if (form.notes)    fields.push({ name: '📝 Notes',      value: form.notes,    inline: false })

  await postToWebhook(WEBHOOK_PLANNING[form.game], {
    embeds: [{
      title:     '📅 Nouveau scrim planifié !',
      color:     0x5865F2,
      fields,
      footer:    { text: 'AXWELD Esport' },
      timestamp: new Date().toISOString(),
    }],
  })
}

/**
 * Post a new proposal to #propositions.
 */
export async function postNewProposal(form, proposalId = null) {
  // Essai 1 : Edge Function (bot Discord avec boutons)
  if (proposalId && SUPABASE_ANON_KEY) {
    try {
      const res = await fetch(NOTIFY_PROPOSAL_URL, {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'apikey':        SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          proposalId,
          game:        form.game,
          opponent:    form.opponent,
          format:      form.format,
          date:        form.proposed_date,
          time:        form.proposed_time,
          min_players: form.min_players,
          notes:       form.notes,
        }),
      })
      if (res.ok) return // succès → on s'arrête là
      console.warn('[Discord] Edge Function status:', res.status)
    } catch (e) {
      console.warn('[Discord] Edge Function error:', e)
    }
  }

  // Fallback : webhook simple (sans boutons)
  const fields = [
    { name: '🎮 Jeu',           value: GAME_LABELS[form.game] ?? form.game,       inline: true },
    { name: '📋 Format',        value: form.format?.toUpperCase() ?? '—',         inline: true },
    { name: '📆 Date proposée', value: form.proposed_date || '—',                 inline: true },
    { name: '🕐 Heure',         value: form.proposed_time?.slice(0,5) || '—',     inline: true },
    { name: '👥 Joueurs min.',  value: String(form.min_players ?? 5),             inline: true },
  ]
  if (form.opponent) fields.push({ name: '⚔️ Adversaire', value: form.opponent, inline: true })
  if (form.notes)    fields.push({ name: '📝 Notes',      value: form.notes,    inline: false })

  await postToWebhook(WEBHOOK_PROPOSALS[form.game], {
    embeds: [{
      title:       '📢 Nouvelle proposition de scrim !',
      color:       0xFEE75C,
      description: 'Connecte-toi sur le site pour accepter ou refuser.',
      fields,
      footer:    { text: 'AXWELD Esport' },
      timestamp: new Date().toISOString(),
    }],
  })
}

/**
 * Post a scrim result to the Discord channel via webhook.
 * Silently fails if the webhook URL is not configured.
 */
export async function postScrimResult({ scrim, form }) {
  const WEBHOOK_URL = WEBHOOK_URLS[scrim.game]
  if (!WEBHOOK_URL) return

  const resultLabel = form.result === 'win' ? '✅ Victoire' : form.result === 'loss' ? '❌ Défaite' : '—'
  const color       = RESULT_COLORS[form.result] ?? 0x5865F2

  const fields = [
    { name: 'Résultat',    value: resultLabel,                                  inline: true  },
    { name: 'Adversaire',  value: scrim.opponent || '—',                        inline: true  },
    { name: 'Format',      value: scrim.format?.toUpperCase() || '—',           inline: true  },
    { name: 'Date',        value: scrim.date || '—',                            inline: true  },
  ]

  if (form.duration)        fields.push({ name: 'Durée',             value: form.duration,        inline: true  })
  if (form.players_present) fields.push({ name: 'Joueurs présents',  value: form.players_present, inline: false })
  if (form.champions)       fields.push({ name: 'Champions joués',   value: form.champions,       inline: false })
  if (form.coach_note)      fields.push({ name: '📝 Note du coach',  value: form.coach_note,      inline: false })

  const body = {
    embeds: [{
      title:     `🎮 Résultat de scrim — ${GAME_LABELS[scrim.game] ?? scrim.game}`,
      color,
      fields,
      footer:    { text: 'AXWELD Esport' },
      timestamp: new Date().toISOString(),
    }],
  }

  await postToWebhook(WEBHOOK_URL, body)
}
