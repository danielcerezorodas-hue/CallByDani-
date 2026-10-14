// Webhook de Stripe (Stripe → Developers → Webhooks → endpoint https://www.callbydani.com/api/stripe/webhook,
// evento checkout.session.completed). Necesita STRIPE_WEBHOOK_SECRET (empieza con "whsec_").
import Stripe from "stripe";
import { SETUP_FEE_PRICE_ID } from "../prices";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(req) {
  const secret = (process.env.STRIPE_WEBHOOK_SECRET || "").trim();
  if (!secret) return new Response("Falta STRIPE_WEBHOOK_SECRET", { status: 500 });

  let event;
  try {
    event = stripe.webhooks.constructEvent(await req.text(), req.headers.get("stripe-signature"), secret);
  } catch (err) {
    return new Response(`Webhook error: ${err.message}`, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    // Semana gratis: deja la tarifa de instalación pendiente en la suscripción,
    // así Stripe la cobra en la primera factura real (día 8), junto con el primer mes.
    if (session.metadata?.setup_fee === "on_trial_end" && session.subscription) {
      const agents = Number.parseInt(session.metadata.agents, 10) || 1;
      try {
        await stripe.invoiceItems.create(
          {
            customer: session.customer,
            subscription: session.subscription,
            pricing: { price: SETUP_FEE_PRICE_ID },
            quantity: agents,
            metadata: { checkout_session: session.id },
          },
          // Stripe puede mandar el mismo evento más de una vez: así no se duplica el cobro
          { idempotencyKey: `setup-fee-${session.id}` }
        );
      } catch (err) {
        // 500 para que Stripe reintente más tarde
        return new Response(`No se pudo agregar la tarifa de instalación: ${err.message}`, { status: 500 });
      }
    }
  }

  return Response.json({ received: true });
}
