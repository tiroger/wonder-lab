// Wonder Lab's API: one Lambda behind CloudFront at /api (docs/accounts.md is the local spec).
// Its function URL only accepts requests CloudFront signs, so nothing else reaches this code.
import { routes, inviteCheck } from './lib/routes.mjs';
import { dynamoStore } from './lib/dynamo.mjs';
import { verifier } from './lib/auth.mjs';

const { TABLE, POOL_ID, CLIENT_ID, AWS_REGION, ADMIN_EMAILS = '' } = process.env;
const store = dynamoStore(TABLE), admins = ADMIN_EMAILS.split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
const app = routes({ store, verify: verifier({ region: AWS_REGION, poolId: POOL_ID, clientId: CLIENT_ID }), config: { region: AWS_REGION, clientId: CLIENT_ID, admins } });

export async function handler(event) {
  const headers = event.headers || {}, http = event.requestContext?.http || {};
  const body = event.body ? (event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString('utf8') : event.body) : '';
  // CloudFront-Viewer-Address is "ip:port"; the request's own source IP is CloudFront's
  const ip = (headers['cloudfront-viewer-address'] || '').replace(/:\d+$/, '') || http.sourceIp || '';
  const res = await app({ method: http.method, path: event.rawPath || '/', headers, body, ip });
  return { statusCode: res.status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' }, body: JSON.stringify(res.body) };
}

// Cognito's pre sign-up hook (a second function, same code): only invited emails can make a grown-up account.
// Cognito shows the app "PreSignUp failed with error INVITE_ONLY.", which the grown-up page turns into a kind message.
const allowed = inviteCheck({ store, admins });
export async function preSignUp(event) {
  if (!(await allowed(event.request?.userAttributes?.email))) throw new Error('INVITE_ONLY');
  return event;
}
