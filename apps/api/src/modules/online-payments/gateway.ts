import { randomUUID } from "node:crypto";

export interface StubGatewayOrder {
  gatewayOrderId: string;
  notes: Record<string, string>;
}

/**
 * Stubbed Razorpay order creation (context/feature-specs/13's Decisions) —
 * no live credentials/network call. `notes` are carried through to the
 * webhook payload in a real Razorpay integration, which is how the webhook
 * handler resolves tenant context without an RLS-bypassing lookup.
 */
export function createStubOrder(notes: Record<string, string>): StubGatewayOrder {
  return { gatewayOrderId: `order_stub_${randomUUID()}`, notes };
}
