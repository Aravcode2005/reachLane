# Reachlane — ₹19 outreach starter kit

A responsive, searchable career research website. It includes 13 leadership profiles researched from **official company pages** (reviewed 2026-11-22), official career links, and downloadable outreach templates plus tracker. A ₹19 Razorpay order / verification flow is provided, but **live payments are disabled until configured**.

## Why not use the old CEO contact sheet directly?

The earlier sheet contains personal phone numbers, personal email addresses, contact notes and explicit **Do Not Disturb / Not interested** entries. Some people in it are explicitly *not* CEOs. That makes it unsuitable to publish or resell wholesale. This MVP deliberately uses **public company leaders and official links only**, with source URLs in `lib/data.js`. The old contact sheet is not bundled with this project.

## Run locally (zero npm dependencies)

Requires Node 20+.

```bash
npm run dev
# open http://localhost:4173
npm test
```

You'll see the free preview immediately. The buy button will correctly state that payments are not configured.

## Connect Razorpay (test mode first)

Create a Razorpay account / obtain approval and API credentials. In local terminal:

```bash
cp .env.example .env
# Edit .env, then load it into your terminal before starting:
set -a; source .env; set +a
npm run dev
```

Required server-only variables:

- `RAZORPAY_KEY_ID`: from Razorpay dashboard (start with `rzp_test_...`)
- `RAZORPAY_KEY_SECRET`: private server secret (never embed in HTML)
- `ACCESS_TOKEN_SECRET`: random secret of at least 24 characters (recommended 32+), e.g. `openssl rand -hex 32`

The server creates **₹19 = 1900 paise** orders via Razorpay. On client checkout success, it checks Razorpay's HMAC signature **and fetches the payment from Razorpay** to confirm `status=captured`, `amount=1900`, `currency=INR` and matching `order_id`, before issuing a signed download token valid for 30 days. Never trust the browser's checkout callback alone.

Production checklist:

1. Register an actual business/operator identity with the payment provider. Configure merchant KYC and settlement account.
2. Publish real seller contact/support details, a legal/privacy policy, refund & cancellation terms consistent with your provider and local law. The included `legal.html` is a **starter draft**, not complete merchant policies.
3. Set the three production environment variables in Vercel Project > Settings > Environment Variables. **Never commit `.env`.**
4. Deploy to Vercel (`vercel` CLI or import repository in Vercel dashboard). The `api/*.js` files are Vercel serverless endpoints and `public/index.html` is static. The local `dev-server.mjs` mimics these routes.
5. Test a Razorpay test-mode order / capture / token issuance and download, then switch to live keys when authorized.
6. Add server-side rate limiting, persistent purchase receipts / customer-support restoration, observability and webhook reconciliation for high-volume production. The supplied stateless token is a lean MVP, not a full e-commerce platform.

**No live website or production payments are claimed by this bundle.**

## Endpoints

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| GET | `/api/status` | Public | Price and payment configuration flag |
| GET | `/api/catalog` | Free / paid | 4 preview profiles; full 13 with signed token |
| POST | `/api/create-order` | Public (configured) | Create a Razorpay order for 1900 paise |
| POST | `/api/verify-payment` | Signed checkout callback | Server verifies capture and issues token |
| GET | `/api/download?type=companies` | Bearer token | Public researched profile CSV |
| GET | `/api/download?type=templates` | Bearer token | 3 cold outreach templates |
| GET | `/api/download?type=tracker` | Bearer token | Application tracking CSV |

## Data standard

`lib/data.js` maintains the real content. Each entry has an official first-party leadership source and an official careers URL. There are **no private phone numbers, guessed emails, outreach histories or scraped user profiles**. Leadership names are public business facts; recheck them periodically as executives move. `angle` is an outreach research prompt, **not a claim of current vacancies**.

If you expand the database, use only public, permitted information and professional contact channels; respect DND/opt-out and the relevant privacy and anti-spam rules.

## Tests

`npm test` covers payment HMAC verification, signed-token expiry and tampering, CSV quoting, price, and the non-private nature of the dataset.
