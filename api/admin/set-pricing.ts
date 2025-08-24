import type { VercelRequest, VercelResponse } from "@vercel/node";
import { adminDb } from "../lib/firebaseAdmin";
import { requireOwner } from "../lib/verifyOwner";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    await requireOwner(req);
    const b = req.body || {};
    const fields = ["base_fare_cents","per_mile_cents","per_minute_cents","minimum_fare_cents"];
    for (const f of fields) {
      if (typeof b[f] !== "number" || b[f] < 0) {
        return res.status(400).json({ error: `Invalid ${f}` });
      }
    }
    const surge = typeof b.surge_multiplier === "number" && b.surge_multiplier > 0 ? b.surge_multiplier : 1;

    await adminDb.collection("config").doc("pricing").set({
      base_fare_cents: b.base_fare_cents,
      per_mile_cents: b.per_mile_cents,
      per_minute_cents: b.per_minute_cents,
      minimum_fare_cents: b.minimum_fare_cents,
      surge_multiplier: surge,
      updated_at: new Date(),
    }, { merge: true });

    return res.json({ success: true });
  } catch (e: any) {
    const code = e?.status || 500;
    console.error("set-pricing error:", e);
    return res.status(code).json({ error: e.message || "Failed to update pricing" });
  }
}
