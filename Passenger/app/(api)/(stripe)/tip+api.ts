
import { Stripe } from "stripe";
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { rideId, tipAmount, user_id, driver_id } = body;
    
    if (!rideId || !tipAmount || !user_id || !driver_id) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
      });
    }
    
    
    const tipAmountCents = Math.round(parseFloat(tipAmount) * 100);
    
    
    const paymentIntent = await stripe.paymentIntents.create({
      amount: tipAmountCents,
      currency: "usd",
      customer: user_id,
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
        customer: user_id,
      }),
    );
  } catch (error) {
    console.error("Error creating tip payment:", error);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
    });
  }
}