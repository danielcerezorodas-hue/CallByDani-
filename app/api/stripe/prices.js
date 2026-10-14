// IDs de precios en Stripe (empiezan con "price_"). Si cambias un precio, cámbialo también en Stripe.

// Precio "Agente" (con precios por volumen: 1 = $1,997, 2-3 = $1,697, 4+ = $1,550).
export const AGENT_PRICE_ID = 'price_1UKWTgJxvEA4yBLNsPIARcH0';

// Tarifa de instalación (pago único, por agente). Se cobra:
//  - "Subscribe now": al momento, junto con el primer mes.
//  - Semana gratis: el día 8, junto con el primer mes (la agrega el webhook de Stripe).
export const SETUP_FEE_PRICE_ID = 'price_1UQHDXJxvEA4yBLNkuYxTGgF';
export const SETUP_FEE_PER_AGENT = 297; // solo para mostrarlo en el checkout: debe coincidir con el precio de Stripe

// Plan "AI Receptionist" ($197/mes, precio fijo, cantidad 1)
export const AI_RECEPTIONIST_PRICE_ID = 'price_1UPD6DJxvEA4yBLNVyyOgbqP';
