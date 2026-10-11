// Crear la cuenta del cliente después de pagar en Stripe.
// Solo funciona con un session_id de Stripe pagado: así nadie crea cuenta sin haber pagado.
import Stripe from "stripe";
import { db } from "../twilio/helpers";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

function fail(message, status = 400) {
  return Response.json({ error: message }, { status });
}

// Devuelve { email, plan } si la sesión de Stripe está pagada, o { error: Response }
async function paidSession(sessionId) {
  if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(String(sessionId || ""))) return { error: fail("Invalid checkout session") };
  let session;
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId);
  } catch {
    return { error: fail("Checkout session not found", 404) };
  }
  const paid = session.status === "complete" && ["paid", "no_payment_required"].includes(session.payment_status);
  if (!paid) return { error: fail("This checkout hasn't been completed", 402) };
  const email = (session.customer_details?.email || session.customer_email || "").trim().toLowerCase();
  if (!email) return { error: fail("No email on this checkout", 400) };
  return {
    email,
    plan: session.metadata?.plan || "agents",
    agents: session.metadata?.agents ? Number(session.metadata.agents) : null,
    customerId: typeof session.customer === "string" ? session.customer : session.customer?.id || null,
    subscriptionId: typeof session.subscription === "string" ? session.subscription : session.subscription?.id || null,
  };
}

async function findUserByEmail(supa, email) {
  for (let page = 1; ; page++) {
    const { data, error } = await supa.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const user = data.users.find(u => u.email?.toLowerCase() === email);
    if (user || data.users.length < 1000) return user || null;
  }
}

// GET /api/account?session_id=cs_... → { email, plan, hasAccount }
export async function GET(req) {
  const s = await paidSession(new URL(req.url).searchParams.get("session_id"));
  if (s.error) return s.error;
  const existing = await findUserByEmail(db(), s.email);
  return Response.json({ email: s.email, plan: s.plan, hasAccount: !!existing });
}

// POST /api/account { session_id, password } → crea el usuario y el registro en clients
export async function POST(req) {
  const { session_id, password } = await req.json().catch(() => ({}));
  if (typeof password !== "string" || password.length < 8) return fail("Password must be at least 8 characters");

  const s = await paidSession(session_id);
  if (s.error) return s.error;

  const supa = db();
  if (await findUserByEmail(supa, s.email)) {
    return fail("You already have an account with this email. Please sign in.", 409);
  }

  const { error: e1 } = await supa.auth.admin.createUser({
    email: s.email,
    password,
    email_confirm: true, // el email ya lo confirmó Stripe al pagar
    app_metadata: {
      role: "client",
      plan: s.plan,
      stripe_customer_id: s.customerId,
      stripe_subscription_id: s.subscriptionId,
    },
  });
  if (e1) return fail(e1.message, 500);

  // Registro del cliente (si ya era lead, lo actualizamos)
  const planLabel = s.plan === "ai_receptionist" ? "ai_receptionist" : `agents:${s.agents || 1}`;
  const { data: existing } = await supa.from("clients").select("id").eq("email", s.email).limit(1);
  const row = { email: s.email, plan: planLabel, status: "active" };
  const { error: e2 } = existing?.length
    ? await supa.from("clients").update(row).eq("id", existing[0].id)
    : await supa.from("clients").insert(row);
  if (e2) console.error("clients upsert:", e2.message);

  return Response.json({ ok: true, email: s.email });
}
