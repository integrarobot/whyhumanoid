# Cutout from an opaque original and its saved mask (mask.py): a pure mask. Only alpha is computed from the mask; the
# colour of EVERY pixel that stays visible, edges included, is the original's, unchanged (no foreground estimation, no
# un-mixing, no repainting; Codex, 27 Nov 2026). Then it crops to the visible figure with a 10 px margin (like trim.py)
# and caps the height (default: no scaling below 3300 px).
#   python3 apply-mask.py original.jpg mask.png out.png [--lo 4] [--hi 250] [--max-height 3300]
import json, argparse
import numpy as np
from PIL import Image
from scipy import ndimage
p = argparse.ArgumentParser()
p.add_argument('src'); p.add_argument('mask'); p.add_argument('dst')
p.add_argument('--lo', type=int, default=4); p.add_argument('--hi', type=int, default=250)
p.add_argument('--max-height', type=int, default=3300); p.add_argument('--pad', type=int, default=10)
a = p.parse_args()
rgb = np.asarray(Image.open(a.src).convert('RGB'))
m = np.asarray(Image.open(a.mask).convert('L')).astype(np.float64)
alpha = np.clip((m - a.lo) / (a.hi - a.lo), 0, 1)
log = {'levels': [a.lo, a.hi]}
# Islands under 0.2 % of the largest region are dropped (specks of background the model kept).
solid = alpha > 0.02
lab, n = ndimage.label(solid)
if n > 1:
    sizes = ndimage.sum(solid, lab, range(1, n + 1))
    small = np.isin(lab, [i + 1 for i, s in enumerate(sizes) if s < 0.002 * sizes.max()])
    alpha[small] = 0; log['islands_cleared_px'] = int(small.sum())
a8 = (alpha * 255).round().astype(np.uint8)
out = np.dstack([rgb, a8])
out[a8 == 0, :3] = 0  # invisible pixels only
vis = a8 > 0
log['visible_rgb_unchanged'] = bool(np.array_equal(out[vis][:, :3], rgb[vis]))
ys, xs = np.where(vis)
H, W = a8.shape
box = (max(int(xs.min()) - a.pad, 0), max(int(ys.min()) - a.pad, 0), min(int(xs.max()) + a.pad + 1, W), min(int(ys.max()) + a.pad + 1, H))
im = Image.fromarray(out, 'RGBA').crop(box)
log['crop_box_in_source'] = list(box)
if im.height > a.max_height:
    w = round(im.width * a.max_height / im.height); im = im.resize((w, a.max_height), Image.LANCZOS); log['scaled_to'] = [w, a.max_height]
    log['visible_rgb_unchanged'] = False  # resampling mixes pixels
im.save(a.dst, optimize=True)
log.update(size=list(im.size), opaque=int((a8 == 255).sum()), semi=int(((a8 > 0) & (a8 < 255)).sum()))
print(json.dumps(log))
