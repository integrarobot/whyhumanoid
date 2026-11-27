// The dashboard bundle build (scripts/build-dashboard.mjs) from a checkout whose path has spaces, non-ASCII letters
// and a question mark, as "Why Humanoid?" does (27 Nov 2026). esbuild must receive real filesystem paths, never the
// percent-encoded URL path. A stand-in esbuild records its arguments, so the test needs no network or toolchain.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync, chmodSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

test('the bundle build passes real paths to esbuild from a folder named "Why Humanoid? Ñandú"', () => {
  const base = mkdtempSync(join(tmpdir(), 'wh-'));
  const root = join(base, 'Why Humanoid? Ñandú', 'server');
  try {
    for (const p of ['scripts', 'public']) cpSync(new URL(`../${p}/`, import.meta.url), join(root, p), { recursive: true });
    const fake = join(base, 'fake esbuild.mjs');
    writeFileSync(fake, `#!/usr/bin/env node
import { existsSync, writeFileSync, appendFileSync } from 'node:fs';
import { dirname } from 'node:path';
const [entry, ...rest] = process.argv.slice(2);
const out = rest.find((a) => a.startsWith('--outfile=')).slice(10);
appendFileSync(${JSON.stringify(join(base, 'args.json'))}, JSON.stringify({ entry, out }) + '\\n');
if (!existsSync(entry) || !existsSync(dirname(out))) process.exit(3);
writeFileSync(out, 'bundle of ' + entry);
`);
    chmodSync(fake, 0o755);
    for (const flag of [[], ['--staging']]) execFileSync(process.execPath, [join(root, 'scripts', 'build-dashboard.mjs'), fake, ...flag], { stdio: 'pipe' });
    const calls = readFileSync(join(base, 'args.json'), 'utf8').trim().split('\n').map((l) => JSON.parse(l));
    assert.equal(calls.length, 2);
    for (const { entry, out } of calls) {
      assert.ok(entry.includes('Why Humanoid? Ñandú') && out.includes('Why Humanoid? Ñandú'), `${entry} | ${out}`);
      assert.doesNotMatch(entry + out, /%20|%3F|%C3/);
    }
    assert.ok(existsSync(join(root, 'dist', 'worker.dashboard.js')) && existsSync(join(root, 'dist', 'worker.staging.js')));
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});
