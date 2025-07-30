const { Stripe } = require("stripe");

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_default', {
  apiVersion: '2023-10-16',
});

module.exports = async (req, res) => {
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
    const {
      name,
      email,
      amount,
      tipAmount = '0',
      driverCommissionRate = 0.80,
      driver_id
    } = req.body;

    if (!name || !email || !amount) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const fareAmount = parseFloat(amount);
    const tipAmountValue = parseFloat(tipAmount);
    const totalAmount = fareAmount + tipAmountValue;
    const driverShare = (fareAmount * driverCommissionRate + tipAmountValue).toFixed(2);
    const companyShare = (fareAmount * (1 - driverCommissionRate)).toFixed(2);

    let customer;
    const doesCustomerExist = await stripe.customers.list({ email });

    if (doesCustomerExist.data.length > 0) {
      customer = doesCustomerExist.data[0];
      if (name && customer.name !== name) {
        customer = await stripe.customers.update(customer.id, { name });
      }
    } else {
      customer = await stripe.customers.create({ name, email });
    }

    const ephemeralKey = await stripe.ephemeralKeys.create(
      { customer: customer.id },
      { apiVersion: "2024-06-20" }
    );

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(totalAmount * 100),
      currency: "usd",
      customer: customer.id,
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: "never",
      },
      metadata: {
        fareAmount: amount,
        tipAmount: tipAmount,
        driverShare: driverShare,
        companyShare: companyShare,
        driver_id: driver_id
      }
    });

    return res.json({
      paymentIntent,
      ephemeralKey,
      customer: customer.id,
    });

  } catch (error) {
    console.error("Error creating payment:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};
