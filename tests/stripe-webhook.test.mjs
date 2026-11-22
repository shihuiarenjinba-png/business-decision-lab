import assert from "node:assert/strict";
import test from "node:test";
import {
  hmacSha256Hex,
  parseStripeSignature,
  verifyStripeSignature,
} from "../server/stripe-signature.js";

test("parseStripeSignature reads timestamp and v1 signatures", () => {
  const parsed = parseStripeSignature("t=1700000000,v1=abc,v1=def");
  assert.equal(parsed.timestamp, 1700000000);
  assert.deepEqual(parsed.signatures, ["abc", "def"]);
});

test("verifyStripeSignature accepts valid signature", async () => {
  const payload = JSON.stringify({ id: "evt_test", type: "checkout.session.completed" });
  const secret = "whsec_test_value";
  const timestamp = 1700000000;
  const signature = await hmacSha256Hex(secret, `${timestamp}.${payload}`);
  const valid = await verifyStripeSignature({
    payload,
    header: `t=${timestamp},v1=${signature}`,
    secret,
    nowSeconds: timestamp,
  });
  assert.equal(valid, true);
});

test("verifyStripeSignature rejects wrong signature", async () => {
  const valid = await verifyStripeSignature({
    payload: "{}",
    header: "t=1700000000,v1=deadbeef",
    secret: "whsec_test_value",
    nowSeconds: 1700000000,
  });
  assert.equal(valid, false);
});

test("verifyStripeSignature rejects stale timestamp", async () => {
  const payload = "{}";
  const secret = "whsec_test_value";
  const timestamp = 1700000000;
  const signature = await hmacSha256Hex(secret, `${timestamp}.${payload}`);
  const valid = await verifyStripeSignature({
    payload,
    header: `t=${timestamp},v1=${signature}`,
    secret,
    nowSeconds: timestamp + 301,
  });
  assert.equal(valid, false);
});
