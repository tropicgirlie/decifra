// /api/verify-payment — confirm Stripe payment and write Pro status to Supabase.
// Env vars required: STRIPE_SECRET_KEY,
//                   SUPABASE_URL, SUPABASE_SERVICE_KEY

// ── Supabase upsert via REST (no SDK needed) ─────────────────────
async function upsertProUser({ email, stripeSessionId, stripeCustomerId, stripeSubId, proExpiresAt }) {
  const supabaseUrl = process.env.SUPABASE_URL || "https://fzazuqhmnbqxeqxbdduu.supabase.co";
  const serviceKey  = process.env.SUPABASE_SERVICE_KEY;
  if (!serviceKey) {
    console.warn("[FemDecode verify-payment] SUPABASE_SERVICE_KEY not set — skipping Supabase write");
    return;
  }
  try {
    const r = await fetch(`${supabaseUrl}/rest/v1/femdecode_users`, {
      method: "POST",
      headers: {
        "apikey":        serviceKey,
        "Authorization": `Bearer ${serviceKey}`,
        "Content-Type":  "application/json",
        "Prefer":        "resolution=merge-duplicates",
      },
      body: JSON.stringify({
        email:             email || null,
        tier:              "pro",
        stripe_session_id: stripeSessionId,
        stripe_customer_id: stripeCustomerId,
        stripe_sub_id:     stripeSubId,
        pro_expires_at:    new Date(proExpiresAt * 1000).toISOString(),
        updated_at:        new Date().toISOString(),
      }),
    });
    if (!r.ok) {
      const txt = await r.text();
      throw new Error(`Supabase write failed: ${r.status} ${txt}`);
    } else {
      console.log("[FemDecode verify-payment] Supabase Pro record written for", email || stripeCustomerId);
    }
  } catch (err) {
    throw new Error(`[FemDecode verify-payment] Supabase error: ${err.message}`);
  }
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { session_id, email } = req.body || {};
  if (!session_id) return res.status(400).json({ error: "Missing session_id" });
  if (!email || typeof email !== "string" || !email.includes("@")) {
    return res.status(400).json({ error: "Missing or invalid email" });
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return res.status(500).json({ error: "STRIPE_SECRET_KEY not configured" });
  }
  const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

  try {
    // Retrieve the Checkout Session from Stripe
    const session = await stripe.checkout.sessions.retrieve(session_id, {
      expand: ["subscription", "customer"],
    });

    if (session.payment_status !== "paid") {
      return res.status(402).json({ error: "Payment not completed" });
    }

    const paidEmail = (session.customer_details?.email || session.customer?.email || "").toLowerCase();
    const submittedEmail = email.toLowerCase();
    if (!paidEmail || paidEmail !== submittedEmail) {
      return res.status(403).json({ error: "Session email does not match user email" });
    }

    // Store entitlement in DB and return authoritative Pro state.
    const now = Math.floor(Date.now() / 1000);
    const exp = now + (32 * 24 * 60 * 60);
    await upsertProUser({
      email: submittedEmail,
      stripeSessionId:  session_id,
      stripeCustomerId: session.customer?.id  || null,
      stripeSubId:      session.subscription?.id || null,
      proExpiresAt:     exp,
    });

    return res.status(200).json({ tier: "pro", expires_at: exp, email: submittedEmail });

  } catch (err) {
    console.error("[FemDecode verify-payment]", err.message);
    return res.status(500).json({ error: err.message });
  }
};
