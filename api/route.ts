import type { VercelRequest, VercelResponse } from "@vercel/node";
import { proxyOrsRequest } from "./_lib/orsProxy.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: { message: "Method not allowed" } });
    return;
  }

  const result = await proxyOrsRequest(process.env.ORS_API_KEY, req.body);
  res.status(result.status).json(result.body);
}
