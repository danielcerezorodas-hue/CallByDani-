import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Precio "Agente" en Stripe (con precios por volumen: 1 = $1,697, 2-3 = $1,550, 4+ = $1,490).
// Pega aquí el ID del precio que creaste en Stripe (empieza con "price_").
const AGENT_PRICE_ID = 'PEGA_AQUI_TU_PRICE_ID';

const MAX_AGENTS = 20;

export async function POST(req) {
  try {
    const { agents, email } = await req.json();
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
