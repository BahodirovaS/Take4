import { Stripe } from "stripe";
import { db } from "@/lib/firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function checkOnboardingStatus(request: Request) {
  try {
    const body = await request.json();
    const { driver_id } = body;

    if (!driver_id) {
      return new Response(
        JSON.stringify({ error: "Driver ID is required" }),
        { status: 400 }
      );
    }
    const driverDocRef = doc(db, "drivers", driver_id);
    const driverDoc = await getDoc(driverDocRef);
    
    if (!driverDoc.exists() || !driverDoc.data().stripe_account_id) {
      return new Response(
        JSON.stringify({ 
          onboarding_completed: false,
          account_exists: false 
        })
      );
    }

    const stripeAccountId = driverDoc.data().stripe_account_id;
    const account = await stripe.accounts.retrieve(stripeAccountId);

    const isComplete = account.details_submitted && 
                      account.charges_enabled && 
                      account.payouts_enabled;

                      await setDoc(driverDocRef, {
      onboarding_completed: isComplete,
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled,
      details_submitted: account.details_submitted,
      last_checked: new Date(),
    }, { merge: true });

    return new Response(
      JSON.stringify({
        onboarding_completed: isComplete,
        account_exists: true,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
        details_submitted: account.details_submitted,
      })
    );
  } catch (error) {
    console.error("Error checking onboarding status:", error);
    return new Response(
      JSON.stringify({ error: "Failed to check status" }),
      { status: 500 }
    );
  }
}