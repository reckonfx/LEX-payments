# ZEX ↔ Logistiks account ledger

A small web app for tracking payments between ZEX and Logistiks (LEX). It covers:

- **Payments:** upload a proof, say what it pays for (portal / invoices / split).
- **LEX invoices:** run, MAWB, amount and the PDF.
- **Portal deposits:** import the Expership CSV; deposits auto-match to your payments.
- **Live balance:** *ZEX owes LEX* or *LEX owes ZEX*.

The team logs in with a shared passcode. Nobody needs a Claude account.

## Deploy on Vercel (about 5 minutes)

1. **Import the project.** On vercel.com go to **Add New → Project** and import this folder: from a private GitHub repo, or run `npx vercel` inside it. Set **Framework Preset** to **Other** and leave the build settings empty.
2. **Add storage.** In the project's **Storage** tab, **Create → Blob** and connect it to this project. This adds `BLOB_READ_WRITE_TOKEN`. All data lives in Blob: the ledger entries (small JSON files) and the proof images.
3. **Set the passcode.** Under **Settings → Environment Variables**, add `APP_PASSCODE`. Optionally add `ANTHROPIC_API_KEY` to read proofs automatically.
4. **Redeploy** so the variables take effect.
5. **Load the data.**
   - Open the site, enter the passcode and click **Load starting data**.
   - Click **Attach starting proofs**, then select **all files** from `seed-proofs.zip` (unzipped). They are matched to the entries by file name (`pay-01.jpg`, `inv-01.pdf`, …).

## How the balance is worked out

- **Net owed to LEX** = invoices charged + amount put in portal − payments. Voided payments are left out.
- **Invoice balance** = invoices − payments marked for invoices.
- **Portal balance** = portal deposits − payments marked for portal.

Deposits LEX funded itself (fund transfer 5 Nov, courtesy credit 23 Nov) count as money ZEX owes.

## Files

| Path | What it does |
|---|---|
| `public/index.html` | The whole app (one page) |
| `api/entries.js` | List / save / delete entries |
| `api/upload.js` | Saves an uploaded proof to Vercel Blob (max ~4 MB) |
| `api/seed.js` + `api/_seed.json` | One-time starting data |
| `api/read-proof.js` | Optional: reads a screenshot with Claude |
| `api/_lib.js` | Passcode check and Vercel Blob storage |

## Security notes

- Every API call needs the passcode. Change `APP_PASSCODE` in Vercel and redeploy to lock everyone out.
- Proof files sit on unguessable URLs but are not behind the passcode. Don't post those links publicly.
- Search engines are told not to index the site.
