// Crea en Stripe (modo real) los productos y precios de CallByDani, iguales a los de prueba.
// Si ya existen (se buscan por lookup_key), los reutiliza: se puede correr más de una vez sin duplicar.
//
// Uso: pon la clave secreta real en un archivo .env.live.local (no se sube a git):
//   STRIPE_SECRET_KEY=sk_live_...
// y corre:  node --env-file=.env.live.local scripts/create-live-prices.mjs
// Al final imprime las variables que hay que poner en Vercel.
import Stripe from "stripe";

const key = (process.env.STRIPE_SECRET_KEY || "").trim();
if (!key.startsWith("sk_live_")) {
  console.error("Este script es para modo real: STRIPE_SECRET_KEY debe empezar con sk_live_");
  process.exit(1);
}
const stripe = new Stripe(key);

const PRICES = [
  {
    env: "STRIPE_AGENT_PRICE_ID",
    lookup_key: "cbd_agent_monthly",
    product: { name: "Bilingual Agent" },
    price: {
      currency: "usd",
      recurring: { interval: "month" },
      billing_scheme: "tiered",
      tiers_mode: "volume",
      tiers: [
        { up_to: 1, unit_amount: 199700 },
        { up_to: 3, unit_amount: 169700 },
        { up_to: "inf", unit_amount: 155000 },
      ],
    },
  },
  {
    env: "STRIPE_SETUP_FEE_PRICE_ID",
    lookup_key: "cbd_setup_fee",
    product: { name: "Setup fee (per agent)", description: "One-time setup and training fee per agent" },
    price: { currency: "usd", unit_amount: 29700 },
  },
  {
    env: "STRIPE_AI_PRICE_ID",
    lookup_key: "cbd_ai_receptionist_monthly",
    product: {
      name: "AI Receptionist",
      description: "AI voice receptionist that answers your calls 24/7 in English and Spanish. Includes 600 minutes per month.",
    },
    price: { currency: "usd", unit_amount: 19700, recurring: { interval: "month" } },
  },
];

const account = await stripe.accounts.retrieve();
console.log(`Cuenta: ${account.business_profile?.name || account.id} · cobros activos: ${account.charges_enabled ? "sí" : "NO"}\n`);

const out = [];
for (const p of PRICES) {
  const { data } = await stripe.prices.list({ lookup_keys: [p.lookup_key], active: true, limit: 1 });
  let price = data[0];
  if (price) {
    console.log(`✓ Ya existía: ${p.product.name} (${price.id})`);
  } else {
    const product = await stripe.products.create(p.product);
    price = await stripe.prices.create({ ...p.price, product: product.id, lookup_key: p.lookup_key });
    console.log(`＋ Creado: ${p.product.name} (${price.id})`);
  }
  out.push(`${p.env}=${price.id}`);
}

console.log("\nPon estas 3 variables en Vercel (Settings → Environment Variables → Production):\n");
console.log(out.join("\n"));
