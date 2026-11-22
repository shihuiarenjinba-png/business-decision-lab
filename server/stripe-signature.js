const encoder = new TextEncoder();

export function parseStripeSignature(header) {
  if (!header || typeof header !== "string") {
    throw new Error("missing_stripe_signature");
  }
  const parts = header.split(",").map((part) => part.trim()).filter(Boolean);
  const parsed = new Map();
  for (const part of parts) {
    const index = part.indexOf("=");
    if (index < 1) continue;
    const key = part.slice(0, index);
    const value = part.slice(index + 1);
    if (!parsed.has(key)) parsed.set(key, []);
    parsed.get(key).push(value);
  }
  const timestampText = parsed.get("t")?.[0];
  const signatures = parsed.get("v1") ?? [];
  const timestamp = Number(timestampText);
  if (!Number.isInteger(timestamp) || signatures.length === 0) {
    throw new Error("invalid_stripe_signature");
  }
  return { timestamp, signatures };
}

export function timingSafeHexEqual(left, right) {
  if (typeof left !== "string" || typeof right !== "string" || left.length !== right.length) {
    return false;
  }
  let diff = 0;
  for (let i = 0; i < left.length; i += 1) {
    diff |= left.charCodeAt(i) ^ right.charCodeAt(i);
  }
  return diff === 0;
}

export async function hmacSha256Hex(secret, message) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const digest = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function verifyStripeSignature({
  payload,
  header,
  secret,
  toleranceSeconds = 300,
  nowSeconds = Math.floor(Date.now() / 1000),
}) {
  if (!secret) return false;
  let parsed;
  try {
    parsed = parseStripeSignature(header);
  } catch {
    return false;
  }
  if (Math.abs(nowSeconds - parsed.timestamp) > toleranceSeconds) {
    return false;
  }
  const expected = await hmacSha256Hex(secret, `${parsed.timestamp}.${payload}`);
  return parsed.signatures.some((signature) => timingSafeHexEqual(signature, expected));
}
