# Cutout from an opaque original and its saved mask (mask.py). Only alpha is computed: every pixel the mask makes fully
# opaque keeps the original's colour exactly; semi-transparent edge pixels get their colour un-mixed from the background
# (pymatting estimate_foreground_ml), so no halo shows on dark or light pages. Nothing is repainted, generated or added.
# Then it crops to the visible figure with a 10 px margin (like trim.py) and caps the height (default 1200 px).
#   python3 apply-mask.py original.jpg mask.png out.png [--lo 4] [--hi 250] [--max-height 1200]
import json, argparse
import numpy as np
from PIL import Image
from scipy import ndimage
from pymatting import estimate_foreground_ml
p = argparse.ArgumentParser()
p.add_argument('src'); p.add_argument('mask'); p.add_argument('dst')
p.add_argument('--lo', type=int, default=4); p.add_argument('--hi', type=int, default=250)
p.add_argument('--max-height', type=int, default=1200); p.add_argument('--pad', type=int, default=10)
a = p.parse_args()
img = np.asarray(Image.open(a.src).convert('RGB')).astype(np.float64) / 255
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
fg = img.copy()
semi = (alpha > 0) & (alpha < 1)
if semi.any():
    est = estimate_foreground_ml(img, alpha)
    fg[semi] = est[semi]
out = np.dstack([fg, alpha])
out = (out * 255).round().clip(0, 255).astype(np.uint8)
out[alpha == 0, :3] = 0
opaque = alpha >= 1
log['opaque_pixels_unchanged'] = bool(np.array_equal(out[opaque][:, :3], (img[opaque] * 255).round().astype(np.uint8)))
ys, xs = np.where(alpha > 0)
H, W = alpha.shape
box = (max(int(xs.min()) - a.pad, 0), max(int(ys.min()) - a.pad, 0), min(int(xs.max()) + a.pad + 1, W), min(int(ys.max()) + a.pad + 1, H))
im = Image.fromarray(out, 'RGBA').crop(box)
log['crop_box_in_source'] = list(box)
if im.height > a.max_height:
    w = round(im.width * a.max_height / im.height); im = im.resize((w, a.max_height), Image.LANCZOS); log['scaled_to'] = [w, a.max_height]
px = np.asarray(im).copy(); px[px[..., 3] == 0, :3] = 0
Image.fromarray(px, 'RGBA').save(a.dst, optimize=True)
log.update(size=list(im.size), opaque=int(opaque.sum()), semi=int(semi.sum()))
print(json.dumps(log))
