import { Stripe } from "stripe";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function getOrCreateDriverAccount(driver_id: string, email: string) {
  try {
    const driverRef = doc(db, "drivers", driver_id);
    const driverDoc = await getDoc(driverRef);
    
    if (driverDoc.exists() && driverDoc.data().stripe_connect_account_id) {
      return driverDoc.data().stripe_connect_account_id;
    }

    const account = await stripe.accounts.create({
      type: 'express',
      country: 'US',
      email: email,
      metadata: {
        driver_id: driver_id,
      },
    });

    await setDoc(driverRef, {
      stripe_connect_account_id: account.id,
      email: email,
      created_at: new Date(),
    }, { merge: true });

    return account.id;
  } catch (error) {
    console.error("Error creating Connect account:", error);
    throw error;
  }
}