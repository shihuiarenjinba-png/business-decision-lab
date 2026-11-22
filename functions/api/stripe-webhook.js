import { verifyStripeSignature } from "../../server/stripe-signature.js";

export async function onRequestPost({ request, env }) {
  const secret = env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return Response.json({ error: "webhook_not_configured" }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return Response.json({ error: "missing_signature" }, { status: 400 });
  }

  const payload = await request.text();
  const valid = await verifyStripeSignature({
    payload,
    header: signature,
    secret,
  });

  if (!valid) {
    return Response.json({ error: "invalid_signature" }, { status: 400 });
  }

  let event;
  try {
    event = JSON.parse(payload);
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }

  return Response.json({
    received: true,
    type: typeof event?.type === "string" ? event.type : "unknown",
  });
}

export function onRequestGet() {
  return Response.json(
    { ok: true, endpoint: "stripe-webhook", method: "POST" },
    { status: 200 }
  );
}
