import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createVerify } from 'node:crypto'

const DISCORD_PUBLIC_KEY   = Deno.env.get('DISCORD_PUBLIC_KEY')        ?? ''
const SUPABASE_URL         = Deno.env.get('SUPABASE_URL')              ?? ''
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

function verifySignature(sig: string, ts: string, body: string): boolean {
  try {
    const verify = createVerify('Ed25519')
    verify.update(ts + body)
    return verify.verify(
      Buffer.from(DISCORD_PUBLIC_KEY, 'hex'),
      Buffer.from(sig, 'hex')
    )
  } catch (e) {
    console.error('Signature error:', e)
    return false
  }
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

  console.log('Public key length:', DISCORD_PUBLIC_KEY.length)
  console.log('Sig length:', sig.length)

  if (!verifySignature(sig, ts, body)) {
    console.error('Invalid signature')
    return new Response('Unauthorized', { status: 401 })
  }

  const interaction = JSON.parse(body)

  // ── Type 1 : PING Discord ─────────────────────────────────
  if (interaction.type === 1) {
    console.log('PING received, sending PONG')
    return json({ type: 1 })
  }

  // ── Type 3 : Clic sur un bouton ───────────────────────────
  if (interaction.type === 3) {
    const discordUserId = interaction.member?.user?.id ?? interaction.user?.id
    const customId      = interaction.data?.custom_id as string ?? ''

    const sep        = customId.indexOf('_')
    const action     = customId.slice(0, sep)
    const proposalId = customId.slice(sep + 1)
    const response   = action === 'accept' ? 'accepted' : 'declined'

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

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

    const { error } = await supabase
      .from('proposal_responses')
      .upsert(
        { proposal_id: proposalId, user_id: userId, response },
        { onConflict: 'proposal_id,user_id' }
      )

    if (error) {
      return json({ type: 4, data: { content: `❌ Erreur : ${error.message}`, flags: 64 } })
    }

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
