import { Stripe } from "stripe";
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      name, 
      email, 
      amount, 
      tipAmount = '0',
      driverCommissionRate = 0.80,
      driver_id 
    } = body;
    
    if (!name || !email || !amount) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
      });
    }
    const fareAmount = parseFloat(amount);
    const tipAmountValue = parseFloat(tipAmount);
    const totalAmount = fareAmount + tipAmountValue;
    const driverShare = (fareAmount * driverCommissionRate + tipAmountValue).toFixed(2);
    const companyShare = (fareAmount * (1 - driverCommissionRate)).toFixed(2);
    
    let customer;
    const doesCustomerExist = await stripe.customers.list({
      email,
    });
    
    if (doesCustomerExist.data.length > 0) {
      customer = doesCustomerExist.data[0];
    } else {
      const newCustomer = await stripe.customers.create({
        name,
        email,
      });
      customer = newCustomer;
    }
    
    const ephemeralKey = await stripe.ephemeralKeys.create(
      { customer: customer.id },
      { apiVersion: "2024-06-20" },
    );
    
    // Option 1: Standard payment approach (tracking splits in metadata)
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(totalAmount * 100),
      currency: "usd",
      customer: customer.id,
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: "never",
      },
      // Store payment details in metadata for future reference
      metadata: {
        fareAmount: amount,
        tipAmount: tipAmount,
        driverShare: driverShare,
        companyShare: companyShare,
        driver_id: driver_id
      }
    });
    
    /* 
    // Option 2: Connected Account approach (if you have driver Stripe accounts)
    // Uncomment this section and comment out the standard approach above
    // Make sure you have created connected accounts for your drivers
    
    // Get the driver's connected account ID from your database
    // const driverStripeAccountId = await getDriverStripeAccountId(driver_id);
    
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(totalAmount * 100),
      currency: "usd",
      customer: customer.id,
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: "never",
      },
      // The application fee is the company's share
      application_fee_amount: Math.round(parseFloat(companyShare) * 100),
      // Transfer the rest to the driver's connected account
      transfer_data: {
        destination: driverStripeAccountId,
      },
      metadata: {
        fareAmount: amount,
        tipAmount: tipAmount,
        driverShare: driverShare,
        companyShare: companyShare,
        driver_id: driver_id
      }
    });
    */
    
    return new Response(
      JSON.stringify({
        paymentIntent: paymentIntent,
        ephemeralKey: ephemeralKey,
        customer: customer.id,
      }),
    );
  } catch (error) {
    console.error("Error creating payment:", error);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
    });
  }
}