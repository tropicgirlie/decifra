// /api/webhook — Stripe webhook handler
// Env vars required: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, SUPABASE_URL, SUPABASE_SERVICE_KEY
// Add this endpoint in Stripe dashboard → Webhooks → add endpoint:
//   URL: https://decode.femhealth.science/api/webhook
//   Events: checkout.session.completed, customer.subscription.updated,
//            customer.subscription.deleted, invoice.payment_failed

const SUPABASE_URL = process.env.SUPABASE_URL || "https://fzazuqhmnbqxeqxbdduu.supabase.co";

// Write Pro status to Supabase using the service role key (bypasses RLS)
async function sbSetPro(email, { tier, stripeCustomerId, stripeSubId, expiresAt }) {
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!key) { console.error("[webhook] SUPABASE_SERVICE_KEY not set"); return; }
  const { createClient } = require("@supabase/supabase-js");
  const sb = createClient(SUPABASE_URL, key);
  const { error } = await sb.from("femdecode_users").upsert({
    email,
    tier,
    stripe_customer_id: stripeCustomerId || null,
    stripe_sub_id:      stripeSubId      || null,
    pro_expires_at:     expiresAt        || null,
  }, { onConflict: "email" });
  if (error) console.error("[webhook] Supabase write error:", error.message);
  else console.log(`[webhook] Supabase updated: ${email} → ${tier}`);
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  if (!process.env.STRIPE_SECRET_KEY) {
    return res.status(500).json({ error: "STRIPE_SECRET_KEY not configured" });
  }
  const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

  const sig    = req.headers["stripe-signature"];
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!secret) {
    console.error("[webhook] STRIPE_WEBHOOK_SECRET not set");
    return res.status(500).json({ error: "STRIPE_WEBHOOK_SECRET not configured" });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, secret);
  } catch (err) {
    console.error("[webhook] Signature verification failed:", err.message);
    return res.status(400).json({ error: `Webhook signature error: ${err.message}` });
  }

  console.log(`[webhook] ${event.type}`, event.id);

  switch (event.type) {

    case "checkout.session.completed": {
      const session = event.data.object;
      if (session.mode !== "subscription") break;
      const email = session.customer_email || session.customer_details?.email;
      if (!email) { console.warn("[webhook] No email on session", session.id); break; }

      // Fetch subscription to get current_period_end
      const sub = await stripe.subscriptions.retrieve(session.subscription);
      const expiresAt = new Date(sub.current_period_end * 1000).toISOString();

      await sbSetPro(email, {
        tier: "pro",
        stripeCustomerId: session.customer,
        stripeSubId:      session.subscription,
        expiresAt,
      });
      break;
    }

    case "customer.subscription.updated": {
      const sub = event.data.object;
      // Retrieve customer email
      const customer = await stripe.customers.retrieve(sub.customer);
      const email = customer.email;
      if (!email) break;

      if (sub.status === "active" || sub.status === "trialing") {
        const expiresAt = new Date(sub.current_period_end * 1000).toISOString();
        await sbSetPro(email, { tier: "pro", stripeCustomerId: sub.customer, stripeSubId: sub.id, expiresAt });
      } else {
        // Paused, past_due, etc — downgrade
        await sbSetPro(email, { tier: "free", stripeCustomerId: sub.customer, stripeSubId: sub.id, expiresAt: null });
      }
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object;
      const customer = await stripe.customers.retrieve(sub.customer);
      const email = customer.email;
      if (!email) break;
      await sbSetPro(email, { tier: "free", stripeCustomerId: sub.customer, stripeSubId: sub.id, expiresAt: null });
      break;
    }

    case "invoice.payment_failed": {
      const inv = event.data.object;
      console.warn("[webhook] Payment failed for customer:", inv.customer, "sub:", inv.subscription);
      // Subscription status will change to past_due — handled by subscription.updated above
      break;
    }

    default:
      console.log(`[webhook] Unhandled event: ${event.type}`);
  }

  return res.status(200).json({ received: true });
};
