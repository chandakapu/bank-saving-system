# Deployment

## Secret Safety

Never store deployed credentials in this repository. Keep them in Render, Vercel, TiDB, or a local ignored `.env` file. Rotate a credential immediately if it is copied into a file, chat, log, or commit.

## Render Backend

Configure these environment variables:

```text
NODE_ENV=production
DB_HOST=<TiDB host>
DB_PORT=4000
DB_USER=<least-privileged application user>
DB_PASSWORD=<secret>
DB_NAME=<database>
DB_SSL=true
ADMIN_USERNAME=<secret>
ADMIN_PASSWORD=<secret, minimum 12 characters>
ADMIN_ROTATE_PASSWORD=false
CORS_ORIGINS=https://bank-saving-system-rouge.vercel.app
COOKIE_SECURE=true
TRUST_PROXY_HOPS=1
```

The backend runs restart-safe additive migrations before bootstrapping the administrator. Back up production before the first hardened deployment. To rotate the administrator password, change `ADMIN_PASSWORD`, set `ADMIN_ROTATE_PASSWORD=true` for one successful deployment, then return it to `false`. Rotation revokes existing sessions.

The TiDB user needs normal application DML plus migration DDL privileges during deployment. Remove DDL privileges after the migration marker is recorded if your operational process supports a separate migration user; later starts check the marker before issuing DDL. Enable TiDB check enforcement for the database (`SET GLOBAL tidb_enable_check_constraint = ON`) so direct database clients receive the same invariant protection as the application.

## Vercel Frontend

The Vercel project must use `frontend` as its Root Directory. `frontend/vercel.json` rewrites same-origin `/api/*` requests to `https://bank-saving-api.onrender.com/api/*`, keeping the secure session cookie first-party. The framework preset is Vite and the output directory is `dist`. Update the rewrite destination if the Render hostname changes.

## Docker Compose

Copy `.env.example` to `.env`, fill all blank secrets, and run:

```bash
docker compose up --build
```

Only port 80 is published. Nginx proxies `/api` to the private backend, and MySQL uses a non-root application account. `COOKIE_SECURE=false` is restricted to this local HTTP stack; production must use HTTPS and `COOKIE_SECURE=true`.

## Credential Rotation

1. Create a replacement credential in TiDB.
2. Update `DB_PASSWORD` in Render and verify a healthy deployment.
3. Revoke the exposed credential in TiDB.
4. Verify login and one read-only API request.
