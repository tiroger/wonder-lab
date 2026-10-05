// Wonder Lab's API: one Lambda behind CloudFront at /api (docs/accounts.md is the local spec).
// CloudFront adds a secret header; anything without it gets a 404, so the function URL can't be used directly.
import { routes } from './lib/routes.mjs';
import { dynamoStore } from './lib/dynamo.mjs';
import { verifier } from './lib/auth.mjs';

const { TABLE, POOL_ID, CLIENT_ID, ORIGIN_SECRET, AWS_REGION } = process.env;
const app = routes({ store: dynamoStore(TABLE), verify: verifier({ region: AWS_REGION, poolId: POOL_ID, clientId: CLIENT_ID }), config: { region: AWS_REGION, clientId: CLIENT_ID } });

export async function handler(event) {
  const headers = event.headers || {}, http = event.requestContext?.http || {};
  let res;
  if (!ORIGIN_SECRET || headers['x-origin-verify'] !== ORIGIN_SECRET) res = { status: 404, body: { error: 'not found' } };
  else {
    const body = event.body ? (event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString('utf8') : event.body) : '';
    // CloudFront-Viewer-Address is "ip:port"; the request's own source IP is CloudFront's
    const ip = (headers['cloudfront-viewer-address'] || '').replace(/:\d+$/, '') || http.sourceIp || '';
    res = await app({ method: http.method, path: event.rawPath || '/', headers, body, ip });
  }
  return { statusCode: res.status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' }, body: JSON.stringify(res.body) };
}
