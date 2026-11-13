// Authenticated read of the private workbook with a Google service account (read-only scope).
// The workbook must be shared with the service account as Viewer.

import { base64url } from '../crypto.js';

const encoder = new TextEncoder();
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SCOPE = 'https://www.googleapis.com/auth/spreadsheets.readonly';

function pemToDer(pem) {
  const body = pem.replace(/-----(BEGIN|END) PRIVATE KEY-----/g, '').replace(/\s+/g, '');
  const binary = atob(body);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

export async function signServiceAccountJwt({ clientEmail, privateKeyPem, now }) {
  const header = base64url(encoder.encode(JSON.stringify({ alg: 'RS256', typ: 'JWT' })));
  const claims = base64url(
    encoder.encode(JSON.stringify({ iss: clientEmail, scope: SCOPE, aud: TOKEN_URL, iat: now, exp: now + 3600 })),
  );
  const unsigned = `${header}.${claims}`;
  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToDer(privateKeyPem.replace(/\\n/g, '\n')),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, encoder.encode(unsigned));
  return `${unsigned}.${base64url(new Uint8Array(signature))}`;
}

export async function getAccessToken({ clientEmail, privateKeyPem, now, fetchImpl = fetch }) {
  const assertion = await signServiceAccountJwt({ clientEmail, privateKeyPem, now });
  const response = await fetchImpl(TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }),
  });
  if (!response.ok) throw new Error(`Google token endpoint returned ${response.status}`);
  const { access_token: accessToken } = await response.json();
  return accessToken;
}

// Returns { [tabName]: string[][] } for the requested tabs.
export async function fetchWorkbookValues({ sheetId, tabs, clientEmail, privateKeyPem, now, accessToken, fetchImpl = fetch }) {
  const token = accessToken ?? await getAccessToken({ clientEmail, privateKeyPem, now, fetchImpl });
  const params = new URLSearchParams({ valueRenderOption: 'FORMATTED_VALUE', majorDimension: 'ROWS' });
  for (const tab of tabs) params.append('ranges', `'${tab.replace(/'/g, "''")}'`);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(sheetId)}/values:batchGet?${params}`;
  const response = await fetchImpl(url, { headers: { authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error(`Sheets API returned ${response.status}`);
  const body = await response.json();
  const result = {};
  (body.valueRanges ?? []).forEach((range, i) => {
    result[tabs[i]] = range.values ?? [];
  });
  return result;
}
