# Integrates a reviewed intake package (run review-intake.py first) into the published presentation, from a mapping
# file that states, per catalogue id, the asset slug, the English alt text, the identity paragraph and an optional
# quality note. Nothing in the package is changed: prepared.png is copied byte for byte, only the WebP twin is made
# (to-webp.py), and the WebP's alpha must equal the PNG's.
#   python3 ops/media/robots/integrate-batch.py <mapping.json>
# mapping.json:
#   {"batch": 8, "intake": "ops/media/intake-08-.../batch-08", "branch": "codex/image-sources-08", "commit": "abc1234",
#    "scope": "All missing images (Javier, 27 Nov 2026)",
#    "items": {"41": {"slug": "holiday-robotics-friday", "alt": "...", "identity": "...", "quality": null}, ...}}
# Writes assets/robots/<slug>/<slug>-full-body.{png,webp}, the entry in tools/robot-presentation.json,
# ops/media/robots/<slug>/PROVENANCE.md, and marks each record "integrated" in ops/media/robots/coverage.json with its
# source. Then run tools/robot-presentation.mjs --check, tools/robot-images-coverage.mjs and the page generators.
import glob, hashlib, json, os, shutil, subprocess, sys
import numpy as np
from PIL import Image

cfg = json.load(open(sys.argv[1]))
D = cfg['intake']
man = {str(m['id']): m for m in json.load(open(f'{D}/manifest.json'))}
cat = {str(r['id']): r for r in json.load(open('data/humanoids-catalogue.json'))['records']}
sha = lambda p: hashlib.sha256(open(p, 'rb').read()).hexdigest()
pres = json.load(open('tools/robot-presentation.json'))
cov = json.load(open('ops/media/robots/coverage.json'))
for i, it in cfg['items'].items():
    m, r, slug = man[i], cat[i], it['slug']
    if str(i) in pres['robots'] and pres['robots'][str(i)].get('image'):
        sys.exit(f'{i}: already has an image; existing presentations are never replaced here')
    src = f'{D}/{m["slug"]}'
    out = f'assets/robots/{slug}'; os.makedirs(out, exist_ok=True)
    png, webp = f'{out}/{slug}-full-body.png', f'{out}/{slug}-full-body.webp'
    shutil.copyfile(f'{src}/prepared.png', png)
    subprocess.run([sys.executable, 'ops/media/robots/to-webp.py', png, webp], check=True)
    if not np.array_equal(np.asarray(Image.open(png).convert('RGBA'))[..., 3], np.asarray(Image.open(webp).convert('RGBA'))[..., 3]):
        sys.exit(f'{i}: WebP alpha differs from PNG')
    W, H = Image.open(png).size
    if [W, H] != list(m['size']) or sha(png) != m['prepared_sha256']:
        sys.exit(f'{i}: copied PNG differs from the manifest')
    pres['robots'][str(i)] = {'recorded': {'Lab': r['Lab'], 'Robot': r.get('Robot')},
        'image': {'src': f'/{webp}', 'fallback': f'/{png}', 'width': W, 'height': H, 'alt': it['alt'],
                  'credit': f'Image: {m["credit"]}', 'provenance': f'ops/media/robots/{slug}/PROVENANCE.md'}}
    orig = glob.glob(f'{src}/original.*')[0]; O = Image.open(orig)
    os.makedirs(f'ops/media/robots/{slug}', exist_ok=True)
    q = f"\n\n- **Quality:** {it['quality']}" if it.get('quality') else ''
    open(f'ops/media/robots/{slug}/PROVENANCE.md', 'w').write(f'''# {r.get('Robot') or r['Lab']} ({r['Lab']}): full-body image, provenance and preparation

Not published from here: `ops/` is excluded from the site. Image batch {cfg['batch']}, {cfg['scope']} (non-generative mask cutouts, original RGB).

## Source

- **Image:** {m['credit']}'s. No open licence is presumed. The site credits it as "Image: {m['credit']}".
- **Page:** {m['source_page']}
- **File:** {m['source_url']}
- **Context (Codex):** {m['source_context']}
- **Downloaded:** by Codex, carried without recompression on the transport branch `{cfg['branch']}` (commit {cfg['commit']}) and kept in `{src}/`.
- **Original:** `{os.path.basename(orig)}`, {O.size[0]} × {O.size[1]} px, {O.mode}, {os.path.getsize(orig):,} bytes, sha256 `{m['original_sha256']}` (equal to Codex's manifest).
- **Preparation:** {'original with its own transparency' if m.get('native_alpha') else 'opaque original'}; non-generative alpha mask ({m.get('refinement', '')}); crop ROI {m['roi']}, alpha bounding box {m['bbox']}, {m['border']} px transparent padding; no RGB edit, no scaling. `prepared.png` sha256 `{m['prepared_sha256']}`, mask sha256 `{m['mask_sha256']}`.

## Catalogue identity

- **Record:** catalogue id {i}, Lab "{r['Lab']}", Robot "{r.get('Robot')}".
- {it['identity']}

## Step here

`prepared.png` is used as delivered, at its native resolution (no trim, no scaling); only the WebP twin is made (`python3 ops/media/robots/to-webp.py`). Checked with `ops/media/robots/review-intake.py`: every visible pixel's colour equals the original's at the same place; corners transparent; no thick semi-transparent region inside the robot; the WebP's alpha equals the PNG's.{q}

## Files integrated (image batch {cfg['batch']}, PR not yet merged)

- **PNG:** `{png}`, {W} × {H} px, sha256 `{sha(png)}` (= the prepared.png).
- **WebP:** `{webp}`, sha256 `{sha(webp)}`.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
''')
    e = cov['robots'].setdefault(str(i), {'recorded': {'Lab': r['Lab'], 'Robot': r.get('Robot')}})
    e['status'] = 'integrated'; e.pop('result', None)
    e.setdefault('sources', []).append({'file': m['source_url'], 'page': m['source_page'], 'sha256': m['original_sha256'], 'by': 'codex',
        'date': m.get('checked_at', ''), 'transparent_original': bool(m.get('native_alpha')), 'verdict': 'usable_cutout',
        'detail': f'alpha mask; RGB exact; prepared {W} × {H} with {m["border"]} px padding.'})
    if it.get('quality'): e['quality_note'] = it['quality']
    print(i, slug, W, H)
with open('tools/robot-presentation.json', 'w') as f: f.write(json.dumps(pres, ensure_ascii=False, indent=2) + '\n')
with open('ops/media/robots/coverage.json', 'w') as f: f.write(json.dumps(cov, ensure_ascii=False, indent=2) + '\n')
