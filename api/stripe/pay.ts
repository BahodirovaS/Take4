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
    const { payment_method_id, payment_intent_id, customer_id, client_secret } = req.body;

    if (!payment_method_id || !payment_intent_id || !customer_id) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const paymentMethod = await stripe.paymentMethods.attach(
      payment_method_id,
      { customer: customer_id },
    );

    const result = await stripe.paymentIntents.confirm(payment_intent_id, {
      payment_method: paymentMethod.id,
    });

    // You might want to add additional logic here, such as:
    // - Send receipt emails
    // - Update transaction records in your database
    // - Send notifications to drivers about new earnings

    return res.json({
      success: true,
      message: "Payment successful",
      result: result,
    });

  } catch (error) {
    console.error("Error paying:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}