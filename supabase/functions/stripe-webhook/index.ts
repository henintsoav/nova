import Stripe from 'npm:stripe@14'
import { createClient } from 'npm:@supabase/supabase-js@2'

Deno.serve(async (req) => {
  const signature   = req.headers.get('stripe-signature') ?? ''
  const body        = await req.text()
  const secretKey   = Deno.env.get('STRIPE_SECRET_KEY')   ?? ''
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? ''

  const stripe = new Stripe(secretKey, { apiVersion: '2024-06-20' })

  let event: Stripe.Event
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret)
  } catch (err) {
    console.error('Webhook signature invalide :', err)
    return new Response(`Webhook Error: ${(err as Error).message}`, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const orderId  = session.metadata?.order_id

    if (!orderId) {
      console.error('order_id absent dans les métadonnées Stripe')
      return new Response('ok', { status: 200 })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Met à jour le statut de la commande
    const { data: order, error: updateError } = await supabase
      .from('orders')
      .update({
        status:           'paid',
        paid_at:          new Date().toISOString(),
        stripe_session_id: session.id,
      })
      .eq('id', orderId)
      .select()
      .single()

    if (updateError) {
      console.error('Erreur mise à jour commande :', updateError)
    }

    // Incrément du code promo si utilisé
    if (order?.promo_code) {
      const { data: promo } = await supabase
        .from('promo_codes')
        .select('id, uses_count')
        .eq('code', order.promo_code)
        .single()

      if (promo) {
        await supabase
          .from('promo_codes')
          .update({ uses_count: (promo.uses_count ?? 0) + 1 })
          .eq('id', promo.id)
      }
    }

    // Notification e-mail (configurer NOTIFY_EMAIL dans les secrets Supabase)
    const notifyEmail = Deno.env.get('NOTIFY_EMAIL')
    if (notifyEmail && order) {
      const itemsSummary = (order.items as Array<{ name: string; size?: string; qty: number }>)
        .map(i => `${i.name}${i.size ? ` (${i.size})` : ''} × ${i.qty}`)
        .join(', ')

      console.log(
        `[NOVA] Nouvelle commande payée #${orderId.slice(0, 8).toUpperCase()} — ` +
        `${order.shipping_name} <${order.shipping_email}> — ` +
        `${parseFloat(order.total).toFixed(2)} € — ` +
        `Articles : ${itemsSummary} — ` +
        `Livraison : ${order.shipping_address}, ${order.shipping_zip} ${order.shipping_city}`
      )

      // Pour envoyer un vrai e-mail, intégrez Resend ici :
      // await fetch('https://api.resend.com/emails', {
      //   method: 'POST',
      //   headers: { 'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`, 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     from: 'AXWELD Boutique <noreply@axweld.fr>',
      //     to: notifyEmail,
      //     subject: `Nouvelle commande #${orderId.slice(0, 8).toUpperCase()} — ${order.shipping_name}`,
      //     html: `<p>Bonjour,</p><p>Nouvelle commande reçue !</p>...`
      //   })
      // })
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
