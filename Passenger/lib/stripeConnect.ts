import { fetchAPI } from "@/lib/fetch";
import { API_ENDPOINTS } from "@/lib/config";

export async function getOrCreateDriverAccount(
  driver_id: string,
  email: string
) {
  try {
    const response = await fetchAPI(API_ENDPOINTS.ONBOARD_DRIVER, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        driver_id,
        email,
      }),
    });

    if (!response?.success) {
      throw new Error(response?.error || "Failed to create Stripe account");
    }

    return response.account_id;
  } catch (error) {
    console.error("Error creating Connect account:", error);
    throw error;
  }
}