// IDs de precios en Stripe (empiezan con "price_"). Si cambias un precio, cámbialo también en Stripe.
// Cada uno se puede poner como variable de entorno (Vercel → Settings → Environment Variables).
// En modo test (sk_test_) se usan los de prueba si la variable no está; en modo real (sk_live_)
// las variables son obligatorias, para nunca mezclar un precio de prueba con la cuenta real.
const LIVE = (process.env.STRIPE_SECRET_KEY || "").trim().startsWith("sk_live_");

function price(envName, testId) {
  const id = (process.env[envName] || "").trim();
  if (id) return id;
  return LIVE ? null : testId;
}

// Precio "Agente" (con precios por volumen: 1 = $1,997, 2-3 = $1,697, 4+ = $1,550).
export const AGENT_PRICE_ID = price("STRIPE_AGENT_PRICE_ID", "price_1UKWTgJxvEA4yBLNsPIARcH0");

// Tarifa de instalación (pago único, por agente). Se cobra:
//  - "Subscribe now": al momento, junto con el primer mes.
//  - Semana gratis: el día 8, junto con el primer mes (la agrega el webhook de Stripe).
export const SETUP_FEE_PRICE_ID = price("STRIPE_SETUP_FEE_PRICE_ID", "price_1UQHDXJxvEA4yBLNkuYxTGgF");
export const SETUP_FEE_PER_AGENT = 297; // solo para mostrarlo en el checkout: debe coincidir con el precio de Stripe

// Plan "AI Receptionist" ($197/mes, precio fijo, cantidad 1)
export const AI_RECEPTIONIST_PRICE_ID = price("STRIPE_AI_PRICE_ID", "price_1UPD6DJxvEA4yBLNVyyOgbqP");

// Devuelve el nombre de la variable que falta (o null si están todas)
export function missingPriceEnv() {
  if (!AGENT_PRICE_ID) return "STRIPE_AGENT_PRICE_ID";
  if (!SETUP_FEE_PRICE_ID) return "STRIPE_SETUP_FEE_PRICE_ID";
  if (!AI_RECEPTIONIST_PRICE_ID) return "STRIPE_AI_PRICE_ID";
  return null;
}
