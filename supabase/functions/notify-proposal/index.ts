const BOT_TOKEN = Deno.env.get('DISCORD_BOT_TOKEN') ?? ''

const CHANNELS: Record<string, string> = {
  lol:      Deno.env.get('DISCORD_CHANNEL_PROPOSALS_LOL')  ?? '',
  wildrift: Deno.env.get('DISCORD_CHANNEL_PROPOSALS_WR')   ?? '',
  valorant: Deno.env.get('DISCORD_CHANNEL_PROPOSALS_VALO') ?? '',
}

const GAME_LABELS: Record<string, string> = {
  lol:      'League of Legends',
  wildrift: 'Wild Rift',
  valorant: 'Valorant',
}

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })

  try {
    const { proposalId, game, opponent, format, date, time, min_players, notes } = await req.json()

    const channelId = CHANNELS[game]
    if (!channelId) {
      return new Response(JSON.stringify({ error: `No channel configured for game: ${game}` }), {
        status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    const fields = [
      { name: '🎮 Jeu',        value: GAME_LABELS[game] ?? game,       inline: true },
      { name: '📋 Format',     value: format?.toUpperCase() ?? '—',    inline: true },
      { name: '📆 Date',       value: date  ?? '—',                    inline: true },
      { name: '🕐 Heure',      value: time?.slice(0, 5) ?? '—',        inline: true },
      { name: '👥 Min joueurs',value: String(min_players ?? 5),        inline: true },
    ]
    if (opponent) fields.push({ name: '⚔️ Adversaire', value: opponent, inline: true })
    if (notes)    fields.push({ name: '📝 Notes',      value: notes,    inline: false })

    const body = {
      embeds: [{
        title:       '📢 Nouvelle proposition de scrim !',
        color:       0xFEE75C,
        description: 'Clique sur un bouton pour répondre directement depuis Discord.',
        fields,
        footer:    { text: 'AXWELD Esport' },
        timestamp: new Date().toISOString(),
      }],
      components: [{
        type: 1,
        components: [
          { type: 2, style: 3, label: '✓ Accepter', custom_id: `accept_${proposalId}` },
          { type: 2, style: 4, label: '✕ Refuser',  custom_id: `decline_${proposalId}` },
        ],
      }],
    }

    const res = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
      method:  'POST',
      headers: {
        'Authorization': `Bot ${BOT_TOKEN}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify(body),
    })

    const result = await res.json()
    console.log('Discord response:', res.status, JSON.stringify(result))

    return new Response(JSON.stringify(result), {
      status:  res.status,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error('Error:', e)
    return new Response(JSON.stringify({ error: String(e) }), {
      status:  500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }
})
