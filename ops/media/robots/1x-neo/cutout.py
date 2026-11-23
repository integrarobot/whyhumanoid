# Usage: python3 cutout.py <original> <mask> <out.png>   (pillow, numpy, scipy, pymatting)
# Faithful cutout of the supplied NEO photo: only an alpha channel is computed; robot pixels are the original's,
# except edge pixels, whose colour is un-mixed from the known studio background (pymatting foreground estimation).
import sys, json
import numpy as np
from PIL import Image
from scipy import ndimage
from pymatting import estimate_foreground_ml

src, mask_path, out_png = sys.argv[1:4]
img = Image.open(src).convert('RGB')
a = np.asarray(img).astype(np.float64) / 255
g = np.asarray(img.convert('L')).astype(int)
alpha = np.asarray(Image.open(mask_path).convert('L')).astype(np.float64) / 255
alpha[alpha >= 250 / 255] = 1.0  # the model leaves solid areas at 254: they are opaque, keep their pixels as they are
alpha[alpha <= 4 / 255] = 0.0
H, W = g.shape
log = {}

# 1) Background seen between the left hand and the thigh: flood from the outside background through
#    background-coloured pixels, only inside that box (a global colour rule would eat the light back of the head).
y0, y1, x0, x1 = 520, 680, 1055, 1110
box = np.zeros_like(g, bool); box[y0:y1, x0:x1] = True
bglike = (g >= 222) & box
seed = bglike & (alpha < 0.5)
lab, n = ndimage.label(bglike)
keep = np.isin(lab, np.unique(lab[seed & (lab > 0)]))
removed_gap = int((keep & (alpha > 0.1)).sum())
alpha[keep] = 0
log['hand_gap_pixels_cleared'] = removed_gap

# 1b) The same background strip where the thumb closes it off from the outside (x 1069-1081, y 555-660): clear
#     background-coloured pixels in that narrow column; un-mix the 2 px of leg and hand edge beside it.
sy0, sy1, sx0, sx1 = 555, 660, 1069, 1082
strip = np.zeros_like(g, bool); strip[sy0:sy1, sx0:sx1] = True
enclosed = strip & (g >= 222)
alpha[enclosed] = 0
edge = ndimage.binary_dilation(enclosed, iterations=2) & ~enclosed & strip
for y, x in zip(*np.where(edge)):
    if not enclosed[y].any(): continue
    side = -1 if x < np.where(enclosed[y])[0].mean() else 1
    if not side: continue
    gin = g[y, x + 3 * side]
    alpha[y, x] = min(alpha[y, x], np.clip((241 - g[y, x]) / max(241 - gin, 1), 0, 1))
log['enclosed_strip_pixels_cleared'] = int(enclosed.sum())

# 2) Contact shadow under the soles. For each column of the feet area: if a shadow-dark pixel (< 90) lies within
#    10 px of the bottom of the silhouette, the sole ends at the first one (shadow bands and floor light below it are
#    floor); otherwise scan up from the bottom past background-light and dark pixels to the first sole-toned one.
#    The boundary is median-smoothed over 11 columns for a clean edge; everything below it becomes transparent.
fx0, fx1 = 860, 1125
ends = np.full(fx1 - fx0, -1)
for k, x in enumerate(range(fx0, fx1)):
    col = np.where(alpha[:, x] > 0.04)[0]
    col = col[col > 985]
    if not len(col): continue
    bottom = col.max(); top = bottom - 24
    dark = [y for y in range(bottom - 9, bottom + 1) if g[y, x] < 90]  # the contact shadow lies within 10 px of the bottom
    if dark:
        # the first shadow-dark row below the sole; everything under it (shadow bands and floor light) is floor
        ends[k] = dark[0]
    else:
        y = bottom
        while y > top and not (90 <= g[y, x] < 200): y -= 1
        ends[k] = y + 1
sm = ends.copy()
for k in np.where(ends > 0)[0]:
    win = ends[max(k - 5, 0):k + 6]; win = win[win > 0]
    sm[k] = int(np.median(win))
cleared = 0
for k, x in enumerate(range(fx0, fx1)):
    if sm[k] <= 0: continue
    cleared += int((alpha[sm[k]:, x] > 0).sum())
    alpha[sm[k]:, x] = 0
for x in range(fx0, fx1):  # floor light left at the new bottom edge by the smoothing (at most 4 px)
    col = np.where(alpha[:, x] > 0.04)[0]; col = col[col > 985]
    if not len(col): continue
    y = col.max()
    while y > col.max() - 4 and g[y, x] >= 200: alpha[y, x] = 0; cleared += 1; y -= 1
log['shadow_pixels_cleared'] = cleared

# 3) Tidy: drop isolated specks, then un-mix edge colours from the background.
solid = alpha > 0.04
lab, n = ndimage.label(solid)
sizes = ndimage.sum(solid, lab, range(1, n + 1))
big = np.argmax(sizes) + 1
specks = solid & (lab != big)
alpha[specks] = 0
log['speck_pixels_cleared'] = int(specks.sum())
fg = estimate_foreground_ml(a, alpha)
semi = (alpha > 0) & (alpha < 1)
rgb = np.where(semi[..., None], fg, a)  # opaque pixels keep their original colour exactly

ys, xs = np.where(alpha > 0.04)
pad = 12
box = (max(xs.min() - pad, 0), max(ys.min() - pad, 0), min(xs.max() + pad + 1, W), min(ys.max() + pad + 1, H))
rgba = np.dstack([np.clip(rgb, 0, 1), alpha])
out = Image.fromarray((rgba * 255 + 0.5).astype(np.uint8), 'RGBA').crop(box)
out.save(out_png, optimize=True)
log.update(crop_box_in_source=box, size=out.size, opaque_unchanged=bool(np.array_equal((rgb[alpha >= 1] * 255 + .5).astype(int), (a[alpha >= 1] * 255 + .5).astype(int))))
print(json.dumps(log, default=int))
