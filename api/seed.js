// POST /api/seed -> loads the reconciled starting data (only when the ledger is empty)
const { store, auth } = require("./_lib");
const SEED = require("./_seed.json");

module.exports = async (req, res) => {
  if (!auth(req, res)) return;
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  try {
    const now = await store.all();
    if (now.length) return res.status(409).json({ error: "Ledger already has entries; starting data not loaded." });
    for (const e of SEED) await store.put({ ...e, updatedAt: new Date().toISOString() });
    return res.status(200).json({ loaded: SEED.length });
  } catch (err) {
    return res.status(500).json({ error: "Seed failed: " + (err.message || err) });
  }
};
