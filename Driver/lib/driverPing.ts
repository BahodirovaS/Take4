export async function pingDriverAdmin(params: {
  adminBaseUrl: string; // e.g. "http://localhost:3000" for local, "https://your-admin.vercel.app" for prod
  driverId: string;
  name?: string;
  email?: string;
  lat: number;
  lng: number;
  status?: "offline" | "available" | "on_trip";
}) {
  try {
    await fetch(`${params.adminBaseUrl}/api/drivers/ping`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        driverId: params.driverId,
        name: params.name,
        email: params.email,
        lat: params.lat,
        lng: params.lng,
        status: params.status ?? "available",
      }),
    });
  } catch (e) {
    console.warn("Admin ping failed:", e);
  }
}