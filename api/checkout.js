// /api/checkout — create a Stripe Checkout session
// Env vars required: STRIPE_SECRET_KEY, STRIPE_PRICE_ID_PRO

const BASE_URL = process.env.FEMDECODE_URL || "https://decode.femhealth.science";

module.exports = async function handler(req, res) {
  // Lazy-init so a missing key returns a clean 500, not a module crash
  if (!process.env.STRIPE_SECRET_KEY) {
    return res.status(500).json({ error: "STRIPE_SECRET_KEY not configured on server" });
  }
  const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { email, plan = "monthly" } = req.body || {};

  const priceId = plan === "annual"
    ? process.env.STRIPE_PRICE_ID_ANNUAL
    : process.env.STRIPE_PRICE_ID_PRO;

  if (!priceId) {
    return res.status(500).json({ error: "STRIPE_PRICE_ID_PRO not configured on server" });
  }

  try {
    const sessionParams = {
      payment_method_types: ["card"],
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${BASE_URL}/?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${BASE_URL}/?payment=cancelled`,
      allow_promotion_codes: true,
      billing_address_collection: "auto",
    };

    // Pre-fill email if provided
    if (email && email.includes("@")) {
      sessionParams.customer_email = email;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);
    return res.status(200).json({ url: session.url, sessionId: session.id });

  } catch (err) {
    console.error("[FemDecode checkout]", err.message);
    return res.status(500).json({ error: err.message });
  }
};
