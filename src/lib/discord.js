const WEBHOOK_URLS = {
  lol:      import.meta.env.VITE_DISCORD_WEBHOOK_LOL,
  wildrift: import.meta.env.VITE_DISCORD_WEBHOOK_WR,
  valorant: import.meta.env.VITE_DISCORD_WEBHOOK_VALO,
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

  try {
    await fetch(WEBHOOK_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    })
  } catch {
    // Never crash the app if Discord is unreachable
  }
}
