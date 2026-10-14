import Stripe from 'stripe';
import { AGENT_PRICE_ID, SETUP_FEE_PRICE_ID, AI_RECEPTIONIST_PRICE_ID } from '../stripe/prices';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const MAX_AGENTS = 20;
const TRIAL_DAYS = 7;

export async function POST(req) {
  try {
    const { agents, email, plan, trial } = await req.json();

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

    // Semana gratis: se pide la tarjeta pero no se cobra nada hasta el día 8.
    // La tarifa de instalación no va en line_items (Stripe la cobraría hoy); la agrega el webhook.
    if (trial) {
      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        ...(email ? { customer_email: email } : {}),
        line_items: [{ price: AGENT_PRICE_ID, quantity }],
        payment_method_collection: 'always',
        subscription_data: {
          trial_period_days: TRIAL_DAYS,
          trial_settings: { end_behavior: { missing_payment_method: 'cancel' } },
          metadata: { agents: String(quantity), setup_fee: 'on_trial_end' },
        },
        custom_text: {
          submit: { message: `You won't be charged today. If you stay after your ${TRIAL_DAYS}-day free trial, your first month and the one-time setup fee are charged on day ${TRIAL_DAYS + 1}.` },
        },
        metadata: { agents: String(quantity), trial: 'true', setup_fee: 'on_trial_end' },
        success_url: `${process.env.NEXT_PUBLIC_URL}/success?session_id={CHECKOUT_SESSION_ID}&trial=1`,
        cancel_url: `${process.env.NEXT_PUBLIC_URL}/pricing`,
      });
      return Response.json({ url: session.url });
    }

    // "Subscribe now": tarifa de instalación + primer mes, cobrados hoy.
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      ...(email ? { customer_email: email } : {}),
      line_items: [
        { price: AGENT_PRICE_ID, quantity },
        { price: SETUP_FEE_PRICE_ID, quantity },
      ],
      metadata: { agents: String(quantity) },
      success_url: `${process.env.NEXT_PUBLIC_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_URL}/pricing`,
    });

    return Response.json({ url: session.url });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
