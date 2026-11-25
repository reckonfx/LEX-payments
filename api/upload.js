// POST /api/upload  (body = the raw file, Content-Type = file type, header x-filename)
// Stores the proof in Vercel Blob and returns its URL. Max ~4 MB (Vercel function body limit).
const crypto = require("crypto");
const { put } = require("@vercel/blob");
const { auth } = require("./_lib");

const OK = /^(image\/(jpeg|png|webp|gif|heic)|application\/pdf)$/;

module.exports = async (req, res) => {
  if (!auth(req, res)) return;
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  const type = String(req.headers["content-type"] || "").split(";")[0].trim();
  if (!OK.test(type)) return res.status(400).json({ error: "Only images or PDF" });
  try {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const buf = Buffer.concat(chunks);
    if (!buf.length) return res.status(400).json({ error: "Empty file" });
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      // local test without Blob: return a data URL
      return res.status(200).json({ url: `data:${type};base64,${buf.toString("base64")}`, type });
    }
    const ext = type === "application/pdf" ? "pdf" : type.split("/")[1].replace("jpeg", "jpg");
    const blob = await put(`proofs/${crypto.randomUUID()}.${ext}`, buf, { access: "public", contentType: type });
    return res.status(200).json({ url: blob.url, type });
  } catch (err) {
    return res.status(500).json({ error: "Upload failed: " + (err.message || err) });
  }
};

module.exports.config = { api: { bodyParser: false } };
