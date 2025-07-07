import { Stripe } from "stripe";
import { db } from "@/lib/firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { driver_id, email, phone, full_name } = body;

    if (!driver_id || !email) {
      return new Response(
        JSON.stringify({ error: "Driver ID and email are required" }),
        { status: 400 }
      );
    }

    const driverDocRef = doc(db, "drivers", driver_id);
    const driverDoc = await getDoc(driverDocRef);
    
    let stripeAccountId;
    
    if (driverDoc.exists() && driverDoc.data().stripe_account_id) {
      stripeAccountId = driverDoc.data().stripe_account_id;
    } else {
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'US',
        email: email,
        metadata: {
          driver_id: driver_id,
        },
      });

      stripeAccountId = account.id;

      await setDoc(driverDocRef, {
        driver_id: driver_id,
        stripe_account_id: stripeAccountId,
        email: email,
        full_name: full_name,
        phone: phone,
        created_at: new Date(),
        onboarding_completed: false,
      }, { merge: true });
    }

    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: `${process.env.APP_URL}/reauth`,
      return_url: `${process.env.APP_URL}/setup-complete`,
      type: 'account_onboarding',
    });

    return new Response(
      JSON.stringify({
        url: accountLink.url,
        account_id: stripeAccountId,
        success: true,
      })
    );
  } catch (error) {
    console.error("Error creating Express setup:", error);
    return new Response(
      JSON.stringify({ error: "Failed to create setup link" }),
      { status: 500 }
    );
  }
}