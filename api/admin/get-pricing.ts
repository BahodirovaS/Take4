import type { VercelRequest, VercelResponse } from "@vercel/node";
import { adminDb } from "../lib/firebaseAdmin";
import { requireOwner } from "../lib/verifyOwner";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  try {
    await requireOwner(req);
    const snap = await adminDb.collection("config").doc("pricing").get();
    return res.status(200).json({ success: true, data: snap.exists ? snap.data() : {} });
  } catch (e: any) {
    const code = e?.status || 500;
    console.error("get-pricing error:", e);
    return res.status(code).json({ error: e.message || "Failed to fetch pricing" });
  }
}
