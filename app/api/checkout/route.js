import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Precio "Agente" en Stripe (con precios por volumen: 1 = $1,997, 2-3 = $1,697, 4+ = $1,550).
// Pega aquí el ID del precio que creaste en Stripe (empieza con "price_").
const AGENT_PRICE_ID = 'price_1UKWTgJxvEA4yBLNsPIARcH0';

// Plan "AI Receptionist" ($197/mes, precio fijo, cantidad 1)
const AI_RECEPTIONIST_PRICE_ID = 'price_1UPD6DJxvEA4yBLNVyyOgbqP';

const MAX_AGENTS = 20;

export async function POST(req) {
  try {
    const { agents, email, plan } = await req.json();

    if (plan === 'ai_receptionist') {
      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        ...(email ? { customer_email: email } : {}),
        line_items: [{ price: AI_RECEPTIONIST_PRICE_ID, quantity: 1 }],
        metadata: { plan: 'ai_receptionist' },
        success_url: `${process.env.NEXT_PUBLIC_URL}/success?session_id={CHECKOUT_SESSION_ID}&plan=ai_receptionist`,
        cancel_url: `${process.env.NEXT_PUBLIC_URL}/pricing`,
      });
      return Response.json({ url: session.url });
    }

    const quantity = Number.parseInt(agents, 10);

    if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_AGENTS) {
      return Response.json({ error: 'Invalid number of agents' }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      ...(email ? { customer_email: email } : {}),
      line_items: [{ price: AGENT_PRICE_ID, quantity }],
      metadata: { agents: String(quantity) },
      success_url: `${process.env.NEXT_PUBLIC_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_URL}/pricing`,
    });

    return Response.json({ url: session.url });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
