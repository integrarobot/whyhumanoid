# Independent review of an image intake package before integration (all batches from 27 Nov 2026 onwards).
# For each entry of <dir>/manifest.json (fields id, slug, roi, bbox, border, size, original_sha256, prepared_sha256,
# mask_sha256) it checks, without changing anything:
#   - SHA-256 of original.*, mask-roi.png and prepared.png equal the manifest;
#   - prepared.png has the manifest size (native, no scaling);
#   - every visible pixel's RGB equals the original's at roi + bbox - border (non-generative, colour untouched);
#   - the four corners are fully transparent;
#   - no thick semi-transparent region inside the robot (alpha 9..234 surviving a 3 px erosion): a region over 1000 px
#     fails (batch 7: R1 chassis about 100,000 px, Eno base halo, GENE.01 hand, Kengo floor, all over 1,400 px);
#     regions of 150 to 1000 px are listed as warnings to inspect on the review images (soft natural edges, such as a
#     shoe's shadow, were accepted after inspection in batch 7);
# and writes <out>/review-<slug>.png on light and dark grounds plus one sheet for the whole package.
#   python3 review-intake.py <intake dir> <out dir>
# Exit code 1 if any check fails. Thick regions are reported with their box (x0, y0, x1, y1) in prepared.png.
import glob, hashlib, json, os, sys
import numpy as np
from PIL import Image
from scipy import ndimage

src, out = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)
sha = lambda p: hashlib.sha256(open(p, 'rb').read()).hexdigest()
ok_all, tiles = True, []
for m in json.load(open(f'{src}/manifest.json')):
    d = f'{src}/{m["slug"]}'
    orig = glob.glob(f'{d}/original.*')[0]
    P = Image.open(f'{d}/prepared.png').convert('RGBA'); a = np.asarray(P)
    O = np.asarray(Image.open(orig).convert('RGB'))
    x0 = m['roi'][0] + m['bbox'][0] - m['border']; y0 = m['roi'][1] + m['bbox'][1] - m['border']
    ys, xs = np.nonzero(a[..., 3] > 0); oy, ox = ys + y0, xs + x0
    inside = (oy >= 0) & (ox >= 0) & (oy < O.shape[0]) & (ox < O.shape[1])
    al = a[..., 3].astype(int); H, W = al.shape
    core = ndimage.binary_erosion((al > 8) & (al < 235), iterations=3)
    lab, n = ndimage.label(core); objs = ndimage.find_objects(lab)
    sizes = ndimage.sum(core, lab, range(1, n + 1)) if n else []
    regions = [(int(s), (o[1].start, o[0].start, o[1].stop, o[0].stop)) for s, o in zip(sizes, objs) if s > 150]
    thick = [x for x in regions if x[0] > 1000]; warn = [x for x in regions if x[0] <= 1000]
    checks = {
        'original_sha256': sha(orig) == m['original_sha256'],
        'prepared_sha256': sha(f'{d}/prepared.png') == m['prepared_sha256'],
        'mask_sha256': sha(f'{d}/mask-roi.png') == m['mask_sha256'],
        'native_size': list(P.size) == list(m['size']),
        'visible_inside_original': bool(inside.all()),
        'rgb_equal': bool(np.array_equal(a[ys[inside], xs[inside], :3], O[oy[inside], ox[inside]])),
        'corners_transparent': all(al[y, x] == 0 for y in (0, H - 1) for x in (0, W - 1)),
        'no_thick_semi_transparent': not thick,
    }
    bad = [k for k, v in checks.items() if not v]
    ok_all &= not bad
    print(m['id'], m['slug'], P.size, 'OK' if not bad else f'FAIL {bad}', f'thick={sorted(thick, reverse=True)[:4]}' if thick else '', f'inspect={sorted(warn, reverse=True)[:4]}' if warn else '')
    row = []
    for bg in ((238, 238, 238), (34, 34, 36)):
        c = Image.new('RGBA', P.size, bg + (255,)); c.alpha_composite(P); row.append(c.convert('RGB'))
    pair = Image.new('RGB', (W * 2 + 12, H), (255, 0, 255)); pair.paste(row[0], (0, 0)); pair.paste(row[1], (W + 12, 0))
    pair.save(f'{out}/review-{m["slug"]}.png')
    t = pair.copy(); t.thumbnail((520, 520)); tiles.append(t)
if tiles:
    h = max(t.height for t in tiles); w = sum(t.width + 10 for t in tiles)
    sheet = Image.new('RGB', (w, h), (255, 0, 255)); x = 0
    for t in tiles: sheet.paste(t, (x, 0)); x += t.width + 10
    sheet.save(f'{out}/review-sheet.jpg', quality=90)
print('ALL OK' if ok_all else 'PROBLEMS')
sys.exit(0 if ok_all else 1)
