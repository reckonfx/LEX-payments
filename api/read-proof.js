// POST /api/read-proof  { image: base64 (no prefix), type: "image/jpeg" }
// Optional: reads amount/date/reference from a payment screenshot with Claude.
// Needs ANTHROPIC_API_KEY in Vercel env; without it the page hides the button.
const { auth } = require("./_lib");

module.exports = async (req, res) => {
  if (!auth(req, res)) return;
  if (req.method === "GET") return res.status(200).json({ enabled: !!process.env.ANTHROPIC_API_KEY });
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  if (!process.env.ANTHROPIC_API_KEY) return res.status(501).json({ error: "ANTHROPIC_API_KEY not set" });
  const { image, type } = req.body || {};
  if (!image || !/^image\/(jpeg|png|webp|gif)$/.test(type || "")) return res.status(400).json({ error: "image (base64) and type required" });
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || "claude-haiku-5-5",
        max_tokens: 400,
        messages: [{ role: "user", content: [
          { type: "image", source: { type: "base64", media_type: type, data: image } },
          { type: "text", text: 'This is a bank or payment app screenshot of a payment to Logistiks. Reply with ONLY JSON: {"amount":number,"currency":"USD"|"PKR","date":"YYYY-MM-DD"|null,"reference":string|null,"payer":string|null,"method":string|null}. amount = amount sent (not fees or balances). reference = confirmation / transaction / STAN number. payer = sending account or person. method = Zelle, Wire, ACH, Raast, bank transfer etc. Use null when not visible.' },
        ] }],
      }),
    });
    const j = await r.json();
    if (!r.ok) return res.status(502).json({ error: j.error?.message || "Claude API error" });
    const text = (j.content || []).map(c => c.text || "").join("");
    const m = text.match(/\{[\s\S]*\}/);
    return res.status(200).json(m ? JSON.parse(m[0]) : {});
  } catch (err) {
    return res.status(500).json({ error: "Read failed: " + (err.message || err) });
  }
};
