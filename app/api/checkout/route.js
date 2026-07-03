import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const PLANS = {
  starter: 'price_1TpDeUJxvEA4yBLNWsPkbBsk',
  business: 'price_1TpDgKJxvEA4yBLN41oUhYkt',
  executive: 'price_1TpDmpJxvEA4yBLNWclFO0Zh',
};

export async function POST(req) {
  try {
    const { plan, email } = await req.json();
    const priceId = PLANS[plan];

    if (!priceId) {
      return Response.json({ error: 'Invalid plan' }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      customer_email: email,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.NEXT_PUBLIC_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_URL}/pricing`,
    });

    return Response.json({ url: session.url });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}