import type { VercelRequest } from "@vercel/node";
import { getAuth } from "firebase-admin/auth";

function withStatus(status: number, message: string) {
  const e = new Error(message) as any;
  e.status = status;
  return e;
}

export async function requireOwner(req: VercelRequest) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) throw withStatus(401, "Missing auth token");

  const decoded = await getAuth().verifyIdToken(token, true);
  const ownerUid = process.env.OWNER_UID;
  const ownerEmail = process.env.OWNER_EMAIL;

  const ok =
    (ownerUid && decoded.uid === ownerUid) ||
    (ownerEmail && decoded.email === ownerEmail) ||
    (decoded as any).admin === true; // optional custom claim

  if (!ok) throw withStatus(403, "Forbidden");
  return { uid: decoded.uid, email: decoded.email };
}
