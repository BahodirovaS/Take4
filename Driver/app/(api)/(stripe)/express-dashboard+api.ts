import { Stripe } from "stripe";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { driver_id } = body;
    
    if (!driver_id) {
      return Response.json(
        { error: "Driver ID is required" },
        { status: 400 }
      );
    }
    
    // Query for driver by clerkId
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
    
    const driverData = driversSnapshot.docs[0].data();
    
    if (!driverData.stripe_connect_account_id) {
      return Response.json(
        {
          error: "Driver account not found. Please complete onboarding first."
        },
        { status: 404 }
      );
    }
    
    const stripeAccountId = driverData.stripe_connect_account_id;
    
    try {
      const loginLink = await stripe.accounts.createLoginLink(stripeAccountId);
      
      return Response.json({
        url: loginLink.url,
        account_id: stripeAccountId,
        success: true,
      });
    } catch (stripeError) {
      console.error("Stripe error creating login link:", stripeError);
      return Response.json(
        { error: "Failed to create dashboard link" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error creating Express dashboard link:", error);
    return Response.json(
      { error: "Failed to create dashboard link" },
      { status: 500 }
    );
  }
}