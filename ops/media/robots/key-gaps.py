# Alpha-only correction of background left semi-opaque or opaque inside gaps of a prepared cutout (batch 9 onwards).
# Inside the given rectangles only (prepared.png coordinates), a pixel's alpha is lowered (never raised) by its colour
# distance to the local background: the median colour of the original's pixels that are already transparent in the
# cutout within a window around it. RGB is never changed; mask-roi.png gets the same alpha at the same places.
#   python3 key-gaps.py <item dir> <manifest.json> <id> --rect x0 y0 x1 y1 [--rect ...] [--near 8] [--far 26]
#       [--bg R G B [--bg ...]] [--window 41] [--luma-white L] [--mask-file F [--levels 85 230]] [--dry-run]
# --mask-file: a segmentation mask of the whole original (mask only, e.g. BiRefNet through rembg); inside the rectangles
#       alpha becomes the lower of the current alpha and the mask levelled --levels (lo..hi -> 0..255).
# --bg: a fixed background colour per rectangle, in the same order (sampled beforehand from the original's transparent
#       pixels around the gap); without it the background is the local median of those pixels in --window.
# --near/--far: distance (RGB, Euclidean) at or below which alpha becomes 0, and at or above which it is kept; linear between.
# --luma-white L: for a white robot on a white ground where the rectangle has been checked to hold only background and
#       dark parts (a cable loop), use luminance instead: alpha = min(alpha, clip((L - luma) / (L - 100))).
# Prints the changed pixel count per rectangle and the new SHA-256 of prepared.png and mask-roi.png; the manifest is
# updated (prepared_sha256, mask_sha256, refinement) unless --dry-run.
import argparse, glob, hashlib, json
import numpy as np
from PIL import Image
from scipy import ndimage

p = argparse.ArgumentParser()
p.add_argument('item'); p.add_argument('manifest'); p.add_argument('id', type=int)
p.add_argument('--rect', type=int, nargs=4, action='append', required=True)
p.add_argument('--near', type=float, default=8); p.add_argument('--far', type=float, default=26)
p.add_argument('--window', type=int, default=41)
p.add_argument('--bg', type=int, nargs=3, action='append')
p.add_argument('--luma-white', type=float)
p.add_argument('--mask-file'); p.add_argument('--levels', type=int, nargs=2, default=[85, 230])
p.add_argument('--dry-run', action='store_true')
a = p.parse_args()
man = json.load(open(a.manifest)); e = [m for m in man if m['id'] == a.id][0]
orig = glob.glob(f'{a.item}/original.*')[0]
O = np.asarray(Image.open(orig).convert('RGB')).astype(float)
P = np.array(Image.open(f'{a.item}/prepared.png').convert('RGBA'))
M = np.array(Image.open(f'{a.item}/mask-roi.png').convert('L'))
dx = e['roi'][0] + e['bbox'][0] - e['border']; dy = e['roi'][1] + e['bbox'][1] - e['border']  # prepared -> original
mx = e['bbox'][0] - e['border']; my = e['bbox'][1] - e['border']                                # prepared -> ROI mask
al = P[..., 3].astype(float)
notes = []
if a.bg and len(a.bg) != len(a.rect): raise SystemExit('--bg must be given once per --rect')
for ri, (x0, y0, x1, y1) in enumerate(a.rect):
    o = O[y0 + dy:y1 + dy, x0 + dx:x1 + dx]; old = al[y0:y1, x0:x1]
    if a.mask_file:
        mm = np.asarray(Image.open(a.mask_file).convert('L')).astype(float)[y0 + dy:y1 + dy, x0 + dx:x1 + dx]
        lo, hi = a.levels; key = np.clip((mm - lo) / (hi - lo), 0, 1) * 255
        notes.append(f'segmentation mask {a.mask_file.split("/")[-1]} levelled {lo}..{hi} in prepared rect {[x0, y0, x1, y1]}')
    elif a.luma_white:
        luma = o @ [0.299, 0.587, 0.114]
        key = np.clip((a.luma_white - luma) / (a.luma_white - 100), 0, 1) * 255
        notes.append(f'luminance key (white {a.luma_white:g}) in prepared rect {[x0, y0, x1, y1]}')
    elif a.bg:
        d = np.sqrt(((o - np.array(a.bg[ri], float)) ** 2).sum(-1))
        key = np.clip((d - a.near) / (a.far - a.near), 0, 1) * 255
        notes.append(f'background-distance key (background {a.bg[ri]}, {a.near:g}..{a.far:g}) in prepared rect {[x0, y0, x1, y1]}')
    else:
        h = a.window // 2
        X0, Y0, X1, Y1 = max(x0 - h, 0), max(y0 - h, 0), min(x1 + h, al.shape[1]), min(y1 + h, al.shape[0])
        win = O[Y0 + dy:Y1 + dy, X0 + dx:X1 + dx]; clear = al[Y0:Y1, X0:X1] == 0
        if clear.sum() < 20: raise SystemExit(f'rect {[x0, y0, x1, y1]}: too few transparent pixels nearby to sample the background')
        # local background: mean of the clear pixels in a window (normalised box filter), sampled at each pixel of the rect
        k = np.ones((a.window, a.window))
        cnt = ndimage.convolve(clear.astype(float), k, mode='constant')
        bg = np.stack([ndimage.convolve(win[..., c] * clear, k, mode='constant') for c in range(3)], -1) / np.maximum(cnt, 1)[..., None]
        bg = bg[y0 - Y0:y1 - Y0, x0 - X0:x1 - X0]; ok = cnt[y0 - Y0:y1 - Y0, x0 - X0:x1 - X0] >= 20
        d = np.sqrt(((o - bg) ** 2).sum(-1))
        key = np.where(ok, np.clip((d - a.near) / (a.far - a.near), 0, 1) * 255, 255)
        notes.append(f'background-distance key ({a.near:g}..{a.far:g}, window {a.window}) in prepared rect {[x0, y0, x1, y1]}')
    new = np.minimum(old, np.round(key))
    print([x0, y0, x1, y1], 'pixels lowered', int((new < old).sum()), 'to zero', int(((new == 0) & (old > 0)).sum()))
    al[y0:y1, x0:x1] = new
A8 = al.astype(np.uint8)
P[..., 3] = A8
ys, xs = np.nonzero(P[..., 3] != np.asarray(Image.open(f'{a.item}/prepared.png').convert('RGBA'))[..., 3])
M[ys + my, xs + mx] = A8[ys, xs]
sha = lambda f: hashlib.sha256(open(f, 'rb').read()).hexdigest()
if a.dry_run:
    Image.fromarray(P, 'RGBA').save(f'{a.item}/prepared.dry.png'); print('dry run: wrote prepared.dry.png'); raise SystemExit
Image.fromarray(P, 'RGBA').save(f'{a.item}/prepared.png', optimize=True)
Image.fromarray(M, 'L').save(f'{a.item}/mask-roi.png', optimize=True)
e['prepared_sha256'] = sha(f'{a.item}/prepared.png'); e['mask_sha256'] = sha(f'{a.item}/mask-roi.png')
e['refinement'] = (e.get('refinement', '') + '; Claude, alpha only: ' + '; '.join(notes)).strip('; ')
open(a.manifest, 'w').write(json.dumps(man, indent=2, ensure_ascii=False) + '\n')
print('prepared', e['prepared_sha256'], 'mask', e['mask_sha256'])
