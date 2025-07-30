import { Stripe } from "stripe";
import type { VercelRequest, VercelResponse } from '@vercel/node';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_default', {
  apiVersion: '2023-08-16',
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { rideId, tipAmount, customer_id, driver_id, payment_method_id } = req.body;

    if (!rideId || !tipAmount || !customer_id || !driver_id || !payment_method_id) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const tipAmountCents = Math.round(parseFloat(tipAmount) * 100);

    if (tipAmountCents <= 0) {
      return res.json({
        success: true,
        message: "No tip amount, skipping payment"
      });
    }

    try {
      const paymentMethod = await stripe.paymentMethods.retrieve(payment_method_id);
      if (paymentMethod.customer !== customer_id) {
        await stripe.paymentMethods.attach(payment_method_id, { customer: customer_id });
      }
    } catch (error) {
      console.error("Error verifying payment method:", error);
      return res.status(400).json({ error: "Invalid payment method" });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: tipAmountCents,
      currency: "usd",
      customer: customer_id,
      payment_method: payment_method_id,
      confirm: true,
      off_session: true,
      capture_method: "automatic",
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: "never",
      },
      metadata: {
        rideId: rideId,
        type: "tip",
        driver_id: driver_id
      },
      description: `Tip for ride ${rideId}`
    });

    return res.json({
      paymentIntent: paymentIntent,
      customer: customer_id,
      success: true
    });

  } catch (error: unknown) {
    console.error("Error creating tip payment:", error);
    let errorMessage = "Internal Server Error";
    
    if (error instanceof Stripe.errors.StripeError) {
      errorMessage = error.message;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

    return res.status(500).json({
      error: errorMessage,
      details: typeof error === 'object' && error !== null ? String(error) : 'Unknown error'
    });
  }
}