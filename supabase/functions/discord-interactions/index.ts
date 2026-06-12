import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import nacl from 'https://esm.sh/tweetnacl@1.0.3'

const DISCORD_PUBLIC_KEY   = Deno.env.get('DISCORD_PUBLIC_KEY')        ?? ''
const SUPABASE_URL         = Deno.env.get('SUPABASE_URL')              ?? ''
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

function hexToUint8(hex: string): Uint8Array {
  const arr = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2)
    arr[i / 2] = parseInt(hex.slice(i, i + 2), 16)
  return arr
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 })

  const sig  = req.headers.get('x-signature-ed25519')  ?? ''
  const ts   = req.headers.get('x-signature-timestamp') ?? ''
  const body = await req.text()

  // ── Vérification signature Discord (obligatoire) ──────────
  const isValid = nacl.sign.detached.verify(
    new TextEncoder().encode(ts + body),
    hexToUint8(sig),
    hexToUint8(DISCORD_PUBLIC_KEY)
  )

  if (!isValid) return new Response('Unauthorized', { status: 401 })

  const interaction = JSON.parse(body)

  // ── Type 1 : PING Discord ─────────────────────────────────
  if (interaction.type === 1) return json({ type: 1 })

  // ── Type 3 : Clic sur un bouton ───────────────────────────
  if (interaction.type === 3) {
    const discordUserId = interaction.member?.user?.id ?? interaction.user?.id
    const customId      = interaction.data?.custom_id as string ?? ''

    const sep        = customId.indexOf('_')
    const action     = customId.slice(0, sep)
    const proposalId = customId.slice(sep + 1)
    const response   = action === 'accept' ? 'accepted' : 'declined'

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    // Trouver l'utilisateur Supabase depuis son Discord ID
    const { data: userId } = await supabase
      .rpc('get_user_from_discord_id', { discord_id: discordUserId })

    if (!userId) {
      return json({
        type: 4,
        data: {
          content: '❌ Compte introuvable. Connecte-toi sur le site avec Discord d\'abord.',
          flags: 64,
        },
      })
    }

    // Enregistrer la réponse
    const { error } = await supabase
      .from('proposal_responses')
      .upsert(
        { proposal_id: proposalId, user_id: userId, response },
        { onConflict: 'proposal_id,user_id' }
      )

    if (error) {
      return json({ type: 4, data: { content: `❌ Erreur : ${error.message}`, flags: 64 } })
    }

    // Vérifier auto-confirm
    if (response === 'accepted') {
      const { data: proposal } = await supabase
        .from('scrim_proposals')
        .select('min_players, status, game, proposed_date, proposed_time, opponent, format, notes')
        .eq('id', proposalId)
        .single()

      if (proposal?.status === 'open') {
        const { count } = await supabase
          .from('proposal_responses')
          .select('*', { count: 'exact', head: true })
          .eq('proposal_id', proposalId)
          .eq('response', 'accepted')

        if ((count ?? 0) >= proposal.min_players) {
          await supabase.from('scrim_proposals').update({ status: 'confirmed' }).eq('id', proposalId)
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
    }

    const emoji = response === 'accepted' ? '✅' : '❌'
    const label = response === 'accepted' ? 'accepté' : 'refusé'

    return json({
      type: 4,
      data: {
        content: `${emoji} Tu as **${label}** cette proposition de scrim.`,
        flags: 64,
      },
    })
  }

  return json({ type: 1 })
})
