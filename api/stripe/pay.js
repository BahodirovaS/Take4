const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_default', {
  apiVersion: '2023-08-16',
});

/**
 * @param {import('@vercel/node').VercelRequest} req
 * @param {import('@vercel/node').VercelResponse} res
 */
module.exports = async function handler(req, res) {
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
      { customer: customer_id }
    );

    const result = await stripe.paymentIntents.confirm(payment_intent_id, {
      payment_method: paymentMethod.id,
    });

    return res.json({
      success: true,
      message: "Payment successful",
      result: result,
    });

  } catch (error) {
    console.error("Error paying:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};
