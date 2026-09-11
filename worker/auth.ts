import { createRemoteJWKSet, jwtVerify } from 'jose';
import type { Env } from './env';

const keySets = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

// Verify the signature, issuer, audience, expiry and explicit email allowlist.
// There is deliberately no password fallback or development bypass in this Worker.
export async function authenticate(request: Request, env: Env) {
  const domain = env.ACCESS_TEAM_DOMAIN;
  const emails = (env.ADMIN_EMAILS ?? '').split(',').map((email) => email.trim().toLowerCase()).filter(Boolean);
  if (!domain || !/^[a-z0-9-]+\.cloudflareaccess\.com$/.test(domain) || !env.ACCESS_AUD || !emails.length) return null;
  const token = request.headers.get('Cf-Access-Jwt-Assertion');
  if (!token || token.length > 16384) return null;
  const issuer = `https://${domain}`;
  let keys = keySets.get(issuer);
  if (!keys) {
    keys = createRemoteJWKSet(new URL(`${issuer}/cdn-cgi/access/certs`));
    keySets.set(issuer, keys);
  }
  try {
    const { payload } = await jwtVerify(token, keys, { issuer, audience: env.ACCESS_AUD, algorithms: ['RS256'], requiredClaims: ['exp', 'iat', 'sub', 'email'] });
    if (typeof payload.email !== 'string' || !emails.includes(payload.email.toLowerCase()) || payload.type !== 'app') return null;
    return { email: payload.email };
  } catch { return null; }
}
