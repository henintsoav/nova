import Stripe from 'npm:stripe@14'
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
      apiVersion: '2024-06-20',
    })

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const {
      items,
      shipping,
      promo_code,
      discount_amount,
      subtotal,
      total,
      user_id,
      pseudo,
      app_url,
    } = await req.json()

    // 1. Crée une commande "pending" en base
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id:          user_id || null,
        pseudo:           pseudo  || null,
        status:           'pending',
        items,
        promo_code:       promo_code || null,
        discount_amount:  discount_amount || 0,
        subtotal,
        total,
        shipping_name:    shipping.name,
        shipping_email:   shipping.email,
        shipping_phone:   shipping.phone  || null,
        shipping_address: shipping.address,
        shipping_city:    shipping.city,
        shipping_zip:     shipping.zip,
        shipping_country: shipping.country || 'France',
      })
      .select('id')
      .single()

    if (orderError) throw new Error(`Erreur création commande : ${orderError.message}`)

    // 2. Construit les line_items Stripe
    const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = items.map(
      (item: { name: string; price: number; size?: string; qty: number }) => ({
        price_data: {
          currency: 'eur',
          product_data: {
            name: item.size ? `${item.name} — Taille ${item.size}` : item.name,
          },
          unit_amount: Math.round(item.price * 100),
        },
        quantity: item.qty,
      })
    )

    // Ligne de réduction si code promo appliqué
    if (discount_amount > 0 && promo_code) {
      line_items.push({
        price_data: {
          currency: 'eur',
          product_data: { name: `Code promo : ${promo_code}` },
          unit_amount: -Math.round(discount_amount * 100),
        },
        quantity: 1,
      })
    }

    // 3. Crée la session Stripe Checkout
    const base = (app_url as string).replace(/\/?$/, '')
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items,
      mode: 'payment',
      success_url: `${base}/#/panier/succes?order_id=${order.id}`,
      cancel_url:  `${base}/#/panier`,
      customer_email: shipping.email,
      metadata: {
        order_id: order.id,
      },
    })

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
