#!/usr/bin/env node
// Per-robot presentation (tools/robot-presentation.json): a display name, a full-body image with real transparency
// and a link to the maker's order page, for the robots that have reviewed values. Applied by tools/build-pages.mjs
// (robot pages and lists) and tools/build-site.mjs (homepage dossier). Never changes data, slugs or relations.
//
//   node tools/robot-presentation.mjs --check     every entry matches its catalogue record; files and URLs are sound

import { existsSync, readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const root = new URL('../', import.meta.url);
const read = (p) => JSON.parse(readFileSync(new URL(p, root), 'utf8'));
const host = (u) => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return null; } };

// Width and height from the file header: PNG (IHDR) or WebP (VP8X, VP8L, VP8).
export function imageSize(buf) {
  if (buf.subarray(1, 4).toString() === 'PNG') return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20), alpha: [4, 6].includes(buf[25]) };
  if (buf.subarray(0, 4).toString() === 'RIFF' && buf.subarray(8, 12).toString() === 'WEBP') {
    const kind = buf.subarray(12, 16).toString();
    if (kind === 'VP8X') return { width: 1 + buf.readUIntLE(24, 3), height: 1 + buf.readUIntLE(27, 3), alpha: Boolean(buf[20] & 0x10) };
    if (kind === 'VP8L') { const b = buf.readUInt32LE(21); return { width: 1 + (b & 0x3fff), height: 1 + ((b >> 14) & 0x3fff), alpha: Boolean((b >> 28) & 1) }; }
    if (kind === 'VP8 ') return { width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff, alpha: false };
  }
  return null;
}

export function presentationProblems(file = read('tools/robot-presentation.json'), catalogue = read('data/humanoids-catalogue.json')) {
  const problems = [];
  const byId = new Map(catalogue.records.map((r) => [String(r.id), r]));
  for (const [id, p] of Object.entries(file.robots ?? {})) {
    const at = `robot ${id}`;
    const r = byId.get(id);
    if (!r) { problems.push(`${at}: no catalogue record with this id`); continue; }
    if (r.Lab !== p.recorded?.Lab || r.Robot !== p.recorded?.Robot) problems.push(`${at}: recorded ${JSON.stringify(p.recorded)} differs from the catalogue (${r.Lab} / ${r.Robot})`);
    if (p.display_name !== undefined && !String(p.display_name).trim()) problems.push(`${at}: empty display_name`);
    if (p.image) {
      const im = p.image;
      if (!im.alt || im.alt.length < 15 || im.alt.length > 160) problems.push(`${at}: image alt must be 15 to 160 characters`);
      if (!im.credit) problems.push(`${at}: image credit missing`);
      if (!im.provenance || !existsSync(new URL(im.provenance, root))) problems.push(`${at}: image provenance file missing`);
      for (const src of [im.src, im.fallback].filter(Boolean)) {
        if (!/^\/assets\/robots\/[a-z0-9-]+\/[a-z0-9-]+\.(webp|png)$/.test(src)) { problems.push(`${at}: ${src} is not under /assets/robots/`); continue; }
        const f = new URL(src.slice(1), root);
        if (!existsSync(f)) { problems.push(`${at}: ${src} does not exist`); continue; }
        const size = imageSize(readFileSync(f));
        if (!size) problems.push(`${at}: ${src} is not a PNG or WebP`);
        else {
          if (size.width !== im.width || size.height !== im.height) problems.push(`${at}: ${src} is ${size.width}x${size.height}, entry says ${im.width}x${im.height}`);
          if (!size.alpha) problems.push(`${at}: ${src} has no alpha channel (robot images need a transparent background)`);
        }
      }
      if (im.height < 500) problems.push(`${at}: image under 500 px tall`);
    }
    if (p.order) {
      if (!/^https:\/\//.test(p.order.url ?? '')) problems.push(`${at}: order url must be https`);
      else if (host(p.order.url) !== host(r.Web)) problems.push(`${at}: order url host ${host(p.order.url)} is not the maker's site in the record (${host(r.Web)})`);
      if (!p.order.label) problems.push(`${at}: order label missing`);
    }
  }
  return problems;
}

// The entries that apply, by catalogue id (string), each with the site paths a page needs.
export function robotPresentation() {
  const file = read('tools/robot-presentation.json');
  const catalogue = read('data/humanoids-catalogue.json');
  const byId = new Map(catalogue.records.map((r) => [String(r.id), r]));
  const out = new Map();
  for (const [id, p] of Object.entries(file.robots ?? {})) {
    const r = byId.get(id);
    if (!r || r.Lab !== p.recorded?.Lab || r.Robot !== p.recorded?.Robot) continue;
    out.set(id, { name: p.display_name ?? null, image: p.image ?? null, order: p.order ?? null });
  }
  return out;
}

// Run as a script, also from a checkout whose path has spaces or other characters a URL escapes ("Why Humanoid?");
// imported as a module (no argv[1], or another entry point), nothing runs.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const problems = presentationProblems();
  if (problems.length) { console.error(`Robot presentation check FAILED:\n- ${problems.join('\n- ')}`); process.exit(1); }
  const n = Object.keys(read('tools/robot-presentation.json').robots ?? {}).length;
  console.log(`Robot presentation passed: ${n} robot${n === 1 ? '' : 's'}, each matching its catalogue record, with image files, sizes, alpha and maker-site order links checked.`);
}
