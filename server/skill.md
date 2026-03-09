# Ring Wallet Proxy Server

Express.js server deployed to Vercel with Neon Serverless Postgres.

## Key files

- `index.js` — Express app with all routes, exported for Vercel
- `api/index.js` — Vercel serverless entry point (re-exports Express app)
- `db.js` — Neon database layer (schema init, CRUD for dapps + categories)
- `seed.js` — DB seed script
- `provider-script.js` — Loads dappsdk.js as a string for injection
- `vercel.json` — Vercel routing config

## Environment variables

- `DATABASE_URL` — Neon Postgres connection string (required)
- `ADMIN_TOKEN` — Admin API auth token (optional)
- `DAPP_WHITELIST` — Comma-separated allowed hostnames (optional)

## Database

Neon Serverless Postgres with `@neondatabase/serverless` (HTTP driver, no TCP).
Tables: `categories`, `dapps`. Schema auto-created on first request.

## When modifying

- Update `dappsdk.js` in both `skills/dapps/dappsdk.js` and `server/dappsdk.js`
- DB schema changes go in `db.js` `initDB()`
- All routes are in `index.js`, no separate route files
