import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const DISCORD_PUBLIC_KEY    = Deno.env.get('DISCORD_PUBLIC_KEY')    ?? ''
const SUPABASE_URL          = Deno.env.get('SUPABASE_URL')          ?? ''
const SUPABASE_SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

// ── Ed25519 signature verification ───────────────────────────
function hexToBytes(hex: string): Uint8Array {
  const arr = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2)
    arr[i / 2] = parseInt(hex.slice(i, i + 2), 16)
  return arr
}

async function verifySignature(sig: string, ts: string, body: string): Promise<boolean> {
  try {
    const key = await crypto.subtle.importKey(
      'raw', hexToBytes(DISCORD_PUBLIC_KEY),
      { name: 'Ed25519' }, false, ['verify']
    )
    return await crypto.subtle.verify(
      'Ed25519', key,
      hexToBytes(sig),
      new TextEncoder().encode(ts + body)
    )
  } catch {
    return false
  }
}

// ── Main handler ──────────────────────────────────────────────
Deno.serve(async (req) => {
  const sig  = req.headers.get('x-signature-ed25519')  ?? ''
  const ts   = req.headers.get('x-signature-timestamp') ?? ''
  const body = await req.text()

  // Verify Discord signature (required by Discord)
  if (!(await verifySignature(sig, ts, body))) {
    return new Response('Unauthorized', { status: 401 })
  }

  const interaction = JSON.parse(body)

  // ── Type 1 : PING (Discord verification) ─────────────────
  if (interaction.type === 1) {
    return Response.json({ type: 1 })
  }

  // ── Type 3 : Button click ─────────────────────────────────
  if (interaction.type === 3) {
    const discordUserId = interaction.member?.user?.id ?? interaction.user?.id
    const customId      = interaction.data.custom_id as string

    // customId format: "accept_UUID" or "decline_UUID"
    const sep        = customId.indexOf('_')
    const action     = customId.slice(0, sep)              // accept | decline
    const proposalId = customId.slice(sep + 1)             // UUID
    const response   = action === 'accept' ? 'accepted' : 'declined'

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    // 1. Retrouver l'utilisateur Supabase depuis son Discord ID
    const { data: userId } = await supabase
      .rpc('get_user_from_discord_id', { discord_id: discordUserId })

    if (!userId) {
      return Response.json({
        type: 4,
        data: {
          content: '❌ Compte introuvable. Connecte-toi sur le site avec Discord d\'abord.',
          flags: 64, // message visible uniquement par l'utilisateur
        },
      })
    }

    // 2. Enregistrer la réponse
    const { error } = await supabase
      .from('proposal_responses')
      .upsert(
        { proposal_id: proposalId, user_id: userId, response },
        { onConflict: 'proposal_id,user_id' }
      )

    if (error) {
      return Response.json({
        type: 4,
        data: { content: `❌ Erreur : ${error.message}`, flags: 64 },
      })
    }

    // 3. Vérifier auto-confirm
    const { data: proposal } = await supabase
      .from('scrim_proposals')
      .select('min_players, status, game, proposed_date, proposed_time, opponent, format, notes')
      .eq('id', proposalId)
      .single()

    if (proposal?.status === 'open' && response === 'accepted') {
      const { count } = await supabase
        .from('proposal_responses')
        .select('*', { count: 'exact', head: true })
        .eq('proposal_id', proposalId)
        .eq('response', 'accepted')

      if ((count ?? 0) >= proposal.min_players) {
        await supabase
          .from('scrim_proposals')
          .update({ status: 'confirmed' })
          .eq('id', proposalId)

        await supabase.from('scrims').insert({
          title:    proposal.opponent ? `Scrim vs ${proposal.opponent}` : 'Scrim',
          game:     proposal.game,
          date:     proposal.proposed_date,
          time:     proposal.proposed_time,
          opponent: proposal.opponent,
          format:   proposal.format,
          status:   'confirmed',
          notes:    proposal.notes,
        })
      }
    }

    const emoji = response === 'accepted' ? '✅' : '❌'
    const label = response === 'accepted' ? 'accepté' : 'refusé'

    return Response.json({
      type: 4,
      data: {
        content: `${emoji} Tu as **${label}** cette proposition de scrim.`,
        flags: 64,
      },
    })
  }

  return Response.json({ type: 1 })
})
