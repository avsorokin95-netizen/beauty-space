# Cloudflare deployment

Live site: https://victoriya-beauty.space

Admin: https://victoriya-beauty.space/admin

The `www` alias and former Workers hostname redirect public pages to the
canonical domain. Cloudflare Access protects `/admin`, `/admin/*`,
`/api/admin`, and `/api/admin/*` on all three hostnames with the same
application and email allowlist. DNS is managed by Cloudflare; the domain
is registered at Spaceship.

Access application: `Beauty Space Admin` (12-hour email-code sessions).

Production uses Workers Static Assets + a Worker API, D1 for published content,
R2 for uploaded photos, and Cloudflare Access email codes for administration.
The Node server remains available for local development; its passwords and
password reset endpoints do not exist in the Cloudflare runtime.

## Account setup

1. Run `npx wrangler login` and authorize in your browser.
2. Enable **R2 Object Storage** in the Cloudflare dashboard. Billing activation
   may be required. Select Standard storage; quotas are not a hard spending cap.
3. Create a Workers subdomain in **Workers & Pages** if the account has none.
   The initial public URL is `https://beauty-space.<subdomain>.workers.dev`.
   A purchased custom domain is optional.
4. Select **Cloudflare One / Zero Trust → Free** and create a team name.
   Enable the **One-time PIN** login method.
5. In **Access → Applications**, create one **Self-hosted** application with
   a 12-hour session. Add these destinations on the public hostname:
   `/admin`, `/admin/*`, `/api/admin`, `/api/admin/*`.
   Protect only administration, not the whole website or public `/api` routes.
   Keep all destinations in this same application so their AUD is identical.
6. Add an **Allow** policy with **Emails** containing exactly the two approved
   addresses. Do not add an Everyone or Bypass policy. Enable One-time PIN for
   this app. Keep CORS bypass disabled.
7. Copy the application's **AUD** and team domain into `wrangler.jsonc`:
   `ACCESS_AUD`, `ACCESS_TEAM_DOMAIN` (host only, no `https://`). Set `APP_ORIGIN`
   to the final HTTPS origin with no trailing slash. Add the same protection
   for any additional hostname before using it for administration.

The Worker independently verifies the RS256 signature, issuer, audience,
expiry, app-token type and exact email allowlist. Missing configuration fails
closed. There is no local-auth bypass in the deployed Worker.

## Initial data migration

These steps are for a new destination. The content import intentionally does
not overwrite documents that already exist on Cloudflare.

```sh
npx wrangler d1 create beauty-space
```

Copy the returned database ID into `wrangler.jsonc`. If it is already created
and configured, skip creation. Then:

```sh
npx wrangler r2 bucket create beauty-space-media
npx wrangler d1 migrations apply beauty-space --remote
npm run cf:export
npx wrangler d1 execute beauty-space --remote --file .cloudflare-private/content.sql
npm run cf:media -- --remote
```

The exporter reads the latest published `.data/studio.sqlite` rows and copies
referenced uploaded photos. Original portfolio photos are deployed as static
assets. No auth hashes, passwords or sessions are exported. Stop editing the
local admin during the final transfer. From launch onward the online admin is
the source of truth; local edits do not sync to Cloudflare.

Create an ignored `.cloudflare-private/secrets.json` containing an object with
`ADMIN_EMAILS`: a comma-separated list of the same two allowed email addresses.
Do not commit this file. Upload it before the first deployment:

```sh
npx wrangler secret bulk .cloudflare-private/secrets.json
npm run cf:deploy
```

Wrangler may offer to create the new Worker when uploading its first secret.
This is expected. No Paid Workers subscription is required by this setup.

## Verification

```sh
npm run build
npm run cf:check
npm run lint
npm run test:server
npm run test:worker
npx wrangler deploy --dry-run
```

Worker tests run in workerd/Miniflare with real D1/R2 bindings and a test-only
RSA issuer. They cover forged/expired/wrong-audience tokens, both allowed
identities, rejected identities, CSRF, concurrent publication, media validation,
dynamic SEO and a mobile browser uploading a PNG through WebP conversion.
No test keys or test authentication bypasses enter the deployed bundle.

For local Cloudflare previews, apply migrations and import content using
`--local`, upload media with `npm run cf:media`, then run `npm run cf:dev`.
Public pages work locally; the admin deliberately requires genuine Access.
Use `npm run dev` for password-based local editing or `npm run test:worker`
for an isolated end-to-end Access simulation.

After deployment check the public site in a signed-out browser, `/robots.txt`,
`/sitemap.xml`, social metadata and all photos. Verify that `/admin` requests an
email code, both approved addresses can publish changes and a different address
cannot enter. Confirm that `/api/admin/session` cannot be called anonymously.
Test logout and session expiry. Live email delivery is not covered by local tests.

## Maintenance and cost

- Edit prices, photos and contacts in the online `/admin`.
- To revoke access, remove an email from **both** the Access policy and
  `ADMIN_EMAILS`, upload the updated secret, and revoke its Access sessions.
- To change domains, update Access destinations and `APP_ORIGIN`, then deploy.
- D1 Time Travel is available for recovery; take an SQL export before bulk edits:
  `npx wrangler d1 export beauty-space --remote --output .cloudflare-private/backup.sql`.
  Keep a separate copy of uploaded media. Old R2 objects are retained so drafts
  and prior links are not silently broken; periodically review unused objects.
- New uploads are resized to at most 1600px in the browser. The Worker validates
  the WebP container and dimensions, but does not fully decode compressed pixels.
  Media is served only as `image/webp` with `nosniff`.
- Monitor Workers, D1 and R2 usage in the dashboard. The free allowances are
  sufficient only while actual usage stays within them; R2 overages are billable.
  This project enables no paid image-processing service or Paid Workers plan.

References: [Access JWT verification](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/),
[Workers Access paths](https://developers.cloudflare.com/workers/configuration/cloudflare-access/),
[R2 pricing](https://developers.cloudflare.com/r2/pricing/),
[D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/),
[Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/).
