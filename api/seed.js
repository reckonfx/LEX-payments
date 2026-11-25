// POST /api/seed -> loads the reconciled starting data (only when the ledger is empty)
const { store, auth } = require("./_lib");
const SEED = require("./_seed.json");

module.exports = async (req, res) => {
  if (!auth(req, res)) return;
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  try {
    const have = new Set((await store.all()).map(e => e.id));
    const todo = SEED.filter(e => !have.has(e.id));          // safe to run again: only adds what's missing
    const stamp = new Date().toISOString();
    for (let i = 0; i < todo.length; i += 8) {
      await Promise.all(todo.slice(i, i + 8).map(e => store.putNew({ ...e, updatedAt: stamp })));
    }
    return res.status(200).json({ loaded: todo.length, alreadyThere: SEED.length - todo.length });
  } catch (err) {
    console.error("seed failed:", err);
    return res.status(500).json({ error: hint(err) });
  }
};

function hint(err) {
  const m = String(err && err.message || err);
  if (/private/i.test(m)) return "Your Blob store is Private. Create a new Blob store with Public access, connect it to this project and redeploy. (" + m + ")";
  if (/token|BLOB_READ_WRITE_TOKEN/i.test(m)) return "Blob store is not connected to this project (BLOB_READ_WRITE_TOKEN missing). Connect it and redeploy. (" + m + ")";
  return "Seed failed: " + m;
}
