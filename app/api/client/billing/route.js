// Portal de pagos de Stripe para el cliente: actualizar tarjeta, ver y descargar facturas.
// POST → { url } (enlace de un solo uso al portal). Requiere que el portal esté activado en
// Stripe → Settings → Billing → Customer portal (en modo real y en modo test por separado).
import Stripe from "stripe";
import { requireClient, fail } from "../helpers";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(req) {
  // El acuerdo no hace falta para pagar o actualizar la tarjeta
  const { user, admin, error } = await requireClient(req, { requireAgreement: false });
  if (error) return error;
  if (admin) return fail("The admin account has no billing", 400);

  const customer = user.app_metadata?.stripe_customer_id;
  if (!customer) return fail("We couldn't find your billing account. Please contact us.", 404);

  const origin = (process.env.NEXT_PUBLIC_URL || new URL(req.url).origin).replace(/\/$/, "");
  try {
    const session = await stripe.billingPortal.sessions.create({ customer, return_url: `${origin}/dashboard` });
    return Response.json({ url: session.url });
  } catch (e) {
    console.error("billing portal:", e.message);
    return fail("Billing management isn't available right now. Please contact us.", 503);
  }
}
