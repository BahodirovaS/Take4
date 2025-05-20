import { Stripe } from "stripe";
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { rideId, tipAmount, customer_id, driver_id, payment_method_id } = body;
    
    console.log("API received:", {
      rideId: body.rideId,
      tipAmount: body.tipAmount,
      customer_id: body.customer_id,
      driver_id: body.driver_id,
      payment_method_id: body.payment_method_id
    });
    
    if (!rideId || !tipAmount || !customer_id || !driver_id || !payment_method_id) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
      });
    }
    
    const tipAmountCents = Math.round(parseFloat(tipAmount) * 100);
    if (tipAmountCents <= 0) {
      return new Response(JSON.stringify({
        success: true,
        message: "No tip amount, skipping payment"
      }));
    }
    
    try {
      // Verify the payment method is still valid
      const paymentMethod = await stripe.paymentMethods.retrieve(payment_method_id);
      
      if (paymentMethod.customer !== customer_id) {
        // If the payment method doesn't belong to this customer, try to attach it
        await stripe.paymentMethods.attach(payment_method_id, { customer: customer_id });
      }
    } catch (error) {
      console.error("Error verifying payment method:", error);
      return new Response(JSON.stringify({ error: "Invalid payment method" }), { status: 400 });
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
    
    return new Response(
      JSON.stringify({
        paymentIntent: paymentIntent,
        customer: customer_id,
        success: true
      }),
    );
  } catch (error: unknown) {
    console.error("Error creating tip payment:", error);
    let errorMessage = "Internal Server Error";
    
    if (error instanceof Stripe.errors.StripeError) {
      errorMessage = error.message;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    return new Response(JSON.stringify({
      error: errorMessage,
      details: typeof error === 'object' && error !== null ? String(error) : 'Unknown error'
    }), {
      status: 500,
    });
  }
}