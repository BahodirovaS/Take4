import { Stripe } from "stripe";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, updateDoc } from "firebase/firestore";

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
      return Response.json({
        onboarding_completed: false,
        account_exists: false,
        message: "Driver not found"
      });
    }
    
    const driverDoc = driversSnapshot.docs[0];
    const driverData = driverDoc.data();
    
    if (!driverData.stripe_connect_account_id) {
      return Response.json({
        onboarding_completed: false,
        account_exists: false
      });
    }
    
    const stripeAccountId = driverData.stripe_connect_account_id;
    
    try {
      const account = await stripe.accounts.retrieve(stripeAccountId);
      
      const isComplete = account.details_submitted &&
        account.charges_enabled &&
        account.payouts_enabled;
      
      // Update driver document
      await updateDoc(doc(db, "drivers", driverDoc.id), {
        onboarding_completed: isComplete,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
        details_submitted: account.details_submitted,
        last_checked: new Date(),
      });
      
      return Response.json({
        onboarding_completed: isComplete,
        account_exists: true,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
        details_submitted: account.details_submitted,
        account_id: stripeAccountId,
      });
    } catch (stripeError) {
      console.error("Stripe error:", stripeError);
      return Response.json({
        onboarding_completed: false,
        account_exists: true,
        error: "Failed to retrieve Stripe account"
      });
    }
  } catch (error) {
    console.error("Error checking driver status:", error);
    return Response.json(
      { error: "Failed to check status" },
      { status: 500 }
    );
  }
}