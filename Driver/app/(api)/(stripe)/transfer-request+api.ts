import { db } from "@/lib/firebase";
import { collection, addDoc } from "firebase/firestore";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { driver_id, amount, type } = body;

    if (!driver_id || !amount || !type) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400 }
      );
    }

    const transferRequest = {
      driver_id: driver_id,
      amount: parseFloat(amount),
      type: type, // 'instant' or 'standard'
      status: 'requested',
      requested_at: new Date(),
      processed_at: null,
      notes: '',
    };

    const docRef = await addDoc(collection(db, "transfer_requests"), transferRequest);
    return new Response(
      JSON.stringify({
        success: true,
        transfer_request_id: docRef.id,
        message: "Transfer request submitted successfully",
      })
    );
  } catch (error) {
    console.error("Error creating transfer request:", error);
    return new Response(
      JSON.stringify({ error: "Failed to create transfer request" }),
      { status: 500 }
    );
  }
}