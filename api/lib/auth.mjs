// Checks a grown-up's Cognito ID token: an RS256 signature from the user pool's published keys, the issuer,
// the app client, and that it hasn't expired. No libraries: node:crypto does the work.
import { createPublicKey, verify } from 'node:crypto';

export function verifier({ region, poolId, clientId, fetchFn = fetch, now = () => Date.now() }) {
  const iss = `https://cognito-idp.${region}.amazonaws.com/${poolId}`;
  let keys = {}, fetchedAt = 0;
  async function keyFor(kid) {
    // keys rotate rarely; refetch when an unknown key id shows up, at most once a minute
    if (!keys[kid] && now() - fetchedAt > 60_000) {
      fetchedAt = now();
      const res = await fetchFn(`${iss}/.well-known/jwks.json`);
      if (res.ok) keys = Object.fromEntries((await res.json()).keys.map(k => [k.kid, createPublicKey({ key: k, format: 'jwk' })]));
    }
    return keys[kid];
  }
  return async function check(token) {
    try {
      const [h, p, s] = String(token || '').split('.'); if (!s) return null;
      const header = JSON.parse(Buffer.from(h, 'base64url')), claims = JSON.parse(Buffer.from(p, 'base64url'));
      if (header.alg !== 'RS256') return null;
      const key = await keyFor(header.kid); if (!key) return null;
      if (!verify('RSA-SHA256', Buffer.from(`${h}.${p}`), key, Buffer.from(s, 'base64url'))) return null;
      if (claims.iss !== iss || claims.token_use !== 'id' || claims.aud !== clientId || !(claims.exp * 1000 > now())) return null;
      return { sub: claims.sub, email: String(claims.email || '').toLowerCase(), emailVerified: claims.email_verified === true || claims.email_verified === 'true' };
    } catch { return null; }
  };
}
