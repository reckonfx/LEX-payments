// Shared helpers: passcode check + storage in Vercel Blob (each entry = one small JSON blob).
// Falls back to in-memory storage when BLOB_READ_WRITE_TOKEN is missing (local testing).
const { put, list, del } = require("@vercel/blob");

const PFX = "ledger/";
const hasBlob = !!process.env.BLOB_READ_WRITE_TOKEN;
const mem = globalThis.__zexMem || (globalThis.__zexMem = new Map());

async function listAll(prefix) {
  const out = []; let cursor;
  do {
    const r = await list({ prefix, cursor, limit: 1000 });
    out.push(...r.blobs);
    cursor = r.hasMore ? r.cursor : undefined;
  } while (cursor);
  return out;
}
// pathname: ledger/<id>__<timestamp>-<random>.json
function parse(pathname) {
  const m = pathname.slice(PFX.length).match(/^(.+?)__(\d+)/);
  return m ? { id: m[1], ts: Number(m[2]) } : null;
}

const store = {
  persistent: hasBlob,
  async all() {
    if (!hasBlob) return [...mem.values()];
    const latest = new Map();
    for (const b of await listAll(PFX)) {
      const p = parse(b.pathname); if (!p) continue;
      const cur = latest.get(p.id);
      if (!cur || p.ts > cur.ts) latest.set(p.id, { ts: p.ts, url: b.url });
    }
    const docs = await Promise.all([...latest.values()].map(async v => {
      try { const r = await fetch(v.url, { cache: "no-store" }); return r.ok ? await r.json() : null; } catch { return null; }
    }));
    return docs.filter(Boolean);
  },
  async put(e) {
    if (!hasBlob) { mem.set(e.id, e); return; }
    const saved = await put(`${PFX}${e.id}__${Date.now()}.json`, JSON.stringify(e), {
      access: "public", addRandomSuffix: true, contentType: "application/json", cacheControlMaxAge: 60,
    });
    const old = (await listAll(`${PFX}${e.id}__`)).filter(b => b.url !== saved.url).map(b => b.url);
    if (old.length) await del(old);
  },
  async del(id) {
    if (!hasBlob) { mem.delete(id); return; }
    const urls = (await listAll(`${PFX}${id}__`)).map(b => b.url);
    if (urls.length) await del(urls);
  },
};

function auth(req, res) {
  const need = process.env.APP_PASSCODE;
  if (!need) { res.status(500).json({ error: "APP_PASSCODE is not set in Vercel environment variables." }); return false; }
  if ((req.headers["x-passcode"] || "") !== need) { res.status(401).json({ error: "Wrong passcode" }); return false; }
  return true;
}

module.exports = { store, auth };
