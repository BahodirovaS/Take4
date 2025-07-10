import { Stripe } from "stripe";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, updateDoc } from "firebase/firestore";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { driver_id, email } = body;
    
    if (!driver_id || !email) {
      return Response.json(
        { error: "Driver ID and email are required" },
        { status: 400 }
      );
    }
    
    const driversQuery = query(
      collection(db, "drivers"),
      where("clerkId", "==", driver_id)
    );
    
    const driversSnapshot = await getDocs(driversQuery);
    
    if (driversSnapshot.empty) {
      return Response.json(
        { error: "Driver not found" },
        { status: 404 }
      );
    }
    
    const driverDoc = driversSnapshot.docs[0];
    const driverData = driverDoc.data();
    let stripeAccountId = driverData.stripe_connect_account_id;
    
    if (!stripeAccountId) {
      try {
        const account = await stripe.accounts.create({
          type: 'express',
          country: 'US',
          email: email,
          capabilities: {
            card_payments: { requested: true },
            transfers: { requested: true },
          },
          business_type: 'individual',
          business_profile: {
            product_description: 'Transportation services through Cabbage Driver app',
          },
        });
        
        stripeAccountId = account.id;
        
        await updateDoc(doc(db, "drivers", driverDoc.id), {
          stripe_connect_account_id: stripeAccountId,
          stripe_account_created_at: new Date(),
          onboarding_completed: false,
        });
      } catch (stripeError) {
        console.error("Error creating Stripe account:", stripeError);
        return Response.json(
          { error: "Failed to create Stripe account" },
          { status: 500 }
        );
      }
    }
    
    try {
      // Use Stripe's own dashboard URLs - no website needed!
      const accountLink = await stripe.accountLinks.create({
        account: stripeAccountId,
        refresh_url: 'https://dashboard.stripe.com/express/onboarding',
        return_url: 'https://dashboard.stripe.com/express/onboarding/complete',
        type: 'account_onboarding',
      });
      
      return Response.json({
        url: accountLink.url,
        account_id: stripeAccountId,
        success: true,
      });
    } catch (stripeError) {
      console.error("Error creating account link:", stripeError);
      return Response.json(
        { error: "Failed to create onboarding link" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error in onboard-driver:", error);
    return Response.json(
      { error: "Failed to create onboarding link" },
      { status: 500 }
    );
  }
}