// GET    /api/entries          -> all entries
// POST   /api/entries          -> create or update one entry (body = entry; id optional)
// DELETE /api/entries?id=...   -> delete one entry
const crypto = require("crypto");
const { store, auth } = require("./_lib");

const KINDS = ["payment", "invoice", "deposit"];
const NUM = ["no", "amount", "fx", "usd", "fee", "toInvoice", "toPortal", "matchNo"];
const STR = ["kind", "date", "currency", "payer", "method", "ref", "run", "status", "notes", "invoiceNo", "mawb",
  "weight", "depType", "fundedBy", "proofUrl", "proofType", "createdAt"];

function clean(b) {
  const e = {};
  for (const k of STR) if (b[k] != null) e[k] = String(b[k]).slice(0, 2000);
  for (const k of NUM) if (b[k] != null && b[k] !== "") { const n = Number(b[k]); e[k] = Number.isFinite(n) ? n : null; }
  return e;
}

module.exports = async (req, res) => {
  if (!auth(req, res)) return;
  try {
    if (req.method === "GET") {
      return res.status(200).json({ entries: await store.all(), persistent: store.persistent });
    }
    if (req.method === "POST") {
      const b = req.body || {};
      const e = clean(b);
      if (!KINDS.includes(e.kind)) return res.status(400).json({ error: "kind must be payment, invoice or deposit" });
      if (e.kind === "payment" && Math.abs((e.toInvoice || 0) + (e.toPortal || 0) - (e.usd || 0)) > 0.011)
        return res.status(400).json({ error: "Invoices + portal must equal the USD amount" });
      e.id = typeof b.id === "string" && /^[\w-]{1,64}$/.test(b.id) ? b.id : crypto.randomUUID();
      e.updatedAt = new Date().toISOString();
      if (!e.createdAt) e.createdAt = e.updatedAt;
      await store.put(e);
      return res.status(200).json({ entry: e });
    }
    if (req.method === "DELETE") {
      const id = String(req.query.id || "");
      if (!id) return res.status(400).json({ error: "id required" });
      await store.del(id);
      return res.status(200).json({ ok: true });
    }
    res.setHeader("Allow", "GET, POST, DELETE");
    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    return res.status(500).json({ error: "Server error: " + (err.message || err) });
  }
};
