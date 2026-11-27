#!/usr/bin/env node
// Preservation copies stay outside Git. Never invent an archive URL or publish a downloaded source.
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { get } from 'node:https';
import { createHash } from 'node:crypto';
import { mkdir, writeFile, realpath, readFile } from 'node:fs/promises';
import { resolve, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export function publicAddress(ip) {
  if (isIP(ip) === 4) {
    const [a,b] = ip.split('.').map(Number);
    return !(a === 0 || a === 10 || a === 127 || a >= 224 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && (b === 168 || b === 0)) || (a === 100 && b >= 64 && b <= 127) || (a === 198 && (b === 18 || b === 19)));
  }
  if (isIP(ip) === 6) return /^2[0-9a-f]{3}:/i.test(ip) && !/^2001:(?:db8|0|10|20):/i.test(ip);
  return false;
}

export async function safeSourceUrl(value, resolver = lookup) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443') || /(?:^|\.)(?:localhost|local|internal|test|invalid)$/.test(url.hostname)) throw new Error('Source must be public HTTPS without credentials or a custom port');
  const addresses = await resolver(url.hostname.replace(/^\[|\]$/g, ''), { all: true });
  if (!addresses.length || addresses.some(x => !publicAddress(x.address))) throw new Error('Source resolves to a private or unsupported address');
  return url;
}

function fetchPinned(url) {
  return new Promise((accept,reject)=>{
    const request = get(url, {
      headers: { 'user-agent':'WhyHumanoid-EvidencePreservation/1.0 (+https://whyhumanoid.com/method/)' },
      lookup(hostname, options, callback) {
        lookup(hostname, { all:true }).then(addresses=>{
          if (!addresses.length || addresses.some(x=>!publicAddress(x.address))) return callback(new Error('Private source address blocked'));
          // Validate the addresses actually used by this TLS request, preventing DNS rebinding.
          if (options.all) callback(null,addresses); else callback(null,addresses[0].address,addresses[0].family);
        },callback);
      },
    },response=>accept(response));
    request.setTimeout(20000,()=>request.destroy(new Error('Capture timeout')));
    request.on('error',reject);
  });
}

export function publicCaptureError(error) {
  // TLS and filesystem errors can embed local build paths and diagnostic stacks in message. Keep only a bounded
  // category/code; capture manifests are public evidence metadata, not operator diagnostics.
  const code = typeof error?.code === 'string' && /^[A-Z0-9_]{1,40}$/.test(error.code) ? error.code : null;
  if (code === 'EPROTO' || code?.startsWith('ERR_SSL_') || code?.startsWith('CERT_') || code?.includes('CERTIFICATE')) return `TLS handshake failed${code ? ` (${code})` : ''}`;
  if (['ENOTFOUND','EAI_AGAIN'].includes(code)) return `Source hostname did not resolve (${code})`;
  if (['ECONNRESET','ECONNREFUSED','ETIMEDOUT','EHOSTUNREACH','ENETUNREACH'].includes(code)) return `Source connection failed (${code})`;
  if (['EACCES','EPERM','ENOSPC','EROFS','ENOENT','EIO'].includes(code)) return `Preservation file could not be written (${code})`;
  const message = String(error?.message ?? '');
  const known = ['Source must be public HTTPS without credentials or a custom port','Source resolves to a private or unsupported address','Private source address blocked','Redirect limit or missing location','Unsupported capture MIME','Capture exceeds 10 MB','Empty source','Capture timeout'];
  if (known.includes(message) || /^HTTP \d{3}$/.test(message)) return message;
  return `Capture failed${code ? ` (${code})` : ''}`;
}

export async function preservationDirectory(outputDirectory, repositoryRoot = fileURLToPath(new URL('../', import.meta.url))) {
  const destination = resolve(outputDirectory);
  const isOutside = (parent, child) => { const p = relative(parent, child); return p === '..' || p.startsWith(`..${sep}`); };
  if (!isOutside(resolve(repositoryRoot), destination)) throw new Error('Preservation copies must be outside the repository');
  await mkdir(destination, { recursive: true });
  const [actualRoot, actualDestination] = await Promise.all([realpath(repositoryRoot), realpath(destination)]);
  if (!isOutside(actualRoot, actualDestination)) throw new Error('Preservation copies must be outside the repository, including symlink targets');
  return actualDestination;
}

export async function archiveSource(sourceUrl, outputDirectory) {
  const root = fileURLToPath(new URL('../', import.meta.url));
  const destination = await preservationDirectory(outputDirectory, root);
  const result = { source_url: sourceUrl, status: 'failed', captured_at: new Date().toISOString(), source_archive_url: null };
  try {
    let url = await safeSourceUrl(sourceUrl);
    let response;
    for (let redirects = 0; redirects <= 5; redirects++) {
      // Re-check every redirect. CLI is editorial-only, never an unauthenticated server fetch proxy.
      await safeSourceUrl(url.href);
      response = await fetchPinned(url);
      if ([301,302,303,307,308].includes(response.statusCode)) {
        const location = response.headers.location;
        if (!location || redirects === 5) throw new Error('Redirect limit or missing location');
        response.destroy();
        url = await safeSourceUrl(new URL(location, url).href);
        continue;
      }
      break;
    }
    if (!(response.statusCode >= 200 && response.statusCode < 300)) { response.destroy(); throw new Error(`HTTP ${response.statusCode}`); }
    const mime = (response.headers['content-type'] ?? '').split(';')[0].trim();
    if (!['text/html','text/plain','application/pdf','application/json','application/xhtml+xml'].includes(mime)) { response.destroy(); throw new Error('Unsupported capture MIME'); }
    if (Number(response.headers['content-length']) > 10_000_000) { response.destroy(); throw new Error('Capture exceeds 10 MB'); }
    const chunks = []; let size = 0;
    for await (const chunk of response) { size += chunk.length; if (size > 10_000_000) throw new Error('Capture exceeds 10 MB'); chunks.push(chunk); }
    const bytes = Buffer.concat(chunks);
    if (!bytes.length) throw new Error('Empty source');
    const hash = createHash('sha256').update(bytes).digest('hex');
    await mkdir(destination, { recursive: true });
    await writeFile(resolve(destination, hash + '.capture'), bytes, { flag: 'wx' }).catch(e => { if (e.code !== 'EEXIST') throw e; });
    Object.assign(result, { status: 'captured', final_url: url.href, mime_type: mime, bytes: size, sha256: hash });
  } catch (error) { result.error = publicCaptureError(error); }
  return result;
}

// Batch preservation of every source consulted for the selected models, including sources that yielded no claim.
// Append capture attempts; a failed request never becomes an invented archive or a verification upgrade.
export async function archiveCohortSources(cohort, outputDirectory, manifest = { schema_version:'1.0.0', captures:[] }, { retryFailed = false, capture = archiveSource } = {}) {
  if (!Array.isArray(cohort?.records) || manifest.schema_version !== '1.0.0' || !Array.isArray(manifest.captures)) throw new Error('Invalid cohort or capture manifest');
  await preservationDirectory(outputDirectory);
  const sources = [...new Set(cohort.records.flatMap((r) => (r.sources ?? []).map((s) => s.url)).filter(Boolean))];
  const captured = new Set(manifest.captures.filter((c) => c.status === 'captured').map((c) => c.source_url));
  const attempted = new Set(manifest.captures.map((c) => c.source_url));
  const result = { ...manifest, captures: [...manifest.captures] };
  for (const source of sources) {
    if (captured.has(source) || (!retryFailed && attempted.has(source))) continue;
    result.captures.push(await capture(source, outputDirectory));
  }
  return result;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const arg = (flag) => { const i = args.indexOf(flag); if (i < 0 || !args[i + 1] || args[i + 1].startsWith('--')) throw new Error(`Provide ${flag}`); return args[i + 1]; };
  try {
    const cohortPath = resolve(arg('--cohort'));
    const outputDirectory = resolve(arg('--output-dir'));
    const manifestPath = resolve(args.includes('--manifest') ? arg('--manifest') : fileURLToPath(new URL('../data/verification/archives.json', import.meta.url)));
    const cohort = JSON.parse(await readFile(cohortPath, 'utf8'));
    let manifest;
    try { manifest = JSON.parse(await readFile(manifestPath, 'utf8')); } catch (e) { if (e.code !== 'ENOENT') throw e; manifest = { schema_version:'1.0.0', captures:[] }; }
    const result = await archiveCohortSources(cohort, outputDirectory, manifest, { retryFailed: args.includes('--retry-failed') });
    await writeFile(manifestPath, JSON.stringify(result, null, 2) + '\n');
    const added = result.captures.slice(manifest.captures.length);
    console.log(`Source preservation: ${added.filter((c) => c.status === 'captured').length} new captures; ${added.filter((c) => c.status !== 'captured').length} failed attempts; ${result.captures.length} total attempts.`);
  } catch (e) { console.error(e.message); process.exitCode = 1; }
}
