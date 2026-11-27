# Non-generative cutout of one robot from an official original (all batches from 27 Nov 2026 onwards).
# Only the alpha channel is computed; every visible pixel keeps the original's RGB at the same place, at native
# resolution, with a transparent padding border. Writes prepared.png, mask-roi.png and a manifest entry (JSON on stdout)
# in the format review-intake.py and integrate-batch.py read.
#   python3 prepare-cutout.py <original> <out dir> --roi x0 y0 x1 y1 [--alpha model|native|both] [--model birefnet-general]
#       [--lo 85] [--hi 230] [--keep largest|all] [--exclude x0 y0 x1 y1 ...] [--border 20] [--native-levels LO HI]
# --alpha model: alpha from the segmentation model (rembg session, mask only) on the ROI;
#         native: the original's own alpha; both: the lower of the two (an original whose alpha is not clean).
# --keep largest: keep only the largest connected region (isolates one robot from others in the same picture);
#         all: drop only specks under 0.2 % of the largest region.
# --native-levels: with --alpha native, map the original alpha LO..HI to 0..255 (drops a semi-transparent glow baked into
#         the original's alpha around an opaque robot, without a segmentation model).
# --exclude: rectangles in ROI coordinates whose alpha is set to 0 (a shadow, floor, another object): alpha only.
import argparse, hashlib, json, os
import numpy as np
from PIL import Image
from scipy import ndimage

p = argparse.ArgumentParser()
p.add_argument('original'); p.add_argument('out')
p.add_argument('--roi', type=int, nargs=4, required=True)
p.add_argument('--alpha', default='model', choices=['model', 'native', 'both'])
p.add_argument('--model', default='birefnet-general')
p.add_argument('--lo', type=int, default=85); p.add_argument('--hi', type=int, default=230)
p.add_argument('--keep', default='all', choices=['largest', 'all'])
p.add_argument('--exclude', type=int, nargs=4, action='append', default=[])
p.add_argument('--border', type=int, default=20)
p.add_argument('--native-levels', type=int, nargs=2, metavar=('LO', 'HI'))
a = p.parse_args()
os.makedirs(a.out, exist_ok=True)
src = Image.open(a.original)
rgba = np.asarray(src.convert('RGBA'))
x0, y0, x1, y1 = a.roi
roi = rgba[y0:y1, x0:x1]
notes = []
if a.alpha in ('model', 'both'):
    from rembg import new_session, remove
    rgb = Image.fromarray(roi[..., :3])
    if src.mode in ('RGBA', 'LA', 'P'):  # composite on white so the model sees what a reader sees
        bg = Image.new('RGBA', rgb.size, (255, 255, 255, 255)); bg.alpha_composite(Image.fromarray(roi)); rgb = bg.convert('RGB')
    m = np.asarray(remove(rgb, session=new_session(a.model), only_mask=True, post_process_mask=False)).astype(float)
    notes.append(f'{a.model} mask (rembg, mask only)')
else:
    m = roi[..., 3].astype(float)
if a.alpha == 'both':
    m = np.minimum(m, roi[..., 3].astype(float)); notes.append('limited by the original alpha')
if a.alpha == 'native':
    notes.append('original alpha')
if a.alpha != 'native':
    alpha = np.clip((m - a.lo) / (a.hi - a.lo), 0, 1); notes.append(f'levels {a.lo}..{a.hi}')
elif a.native_levels:  # a native alpha with a semi-transparent glow or haze around an opaque robot
    nl, nh = a.native_levels; alpha = np.clip((m - nl) / (nh - nl), 0, 1); notes.append(f'original alpha levels {nl}..{nh}')
else:
    alpha = m / 255.0
solid = alpha > 0.02
lab, n = ndimage.label(solid)
if n > 1:
    sizes = ndimage.sum(solid, lab, range(1, n + 1))
    keep = [int(np.argmax(sizes)) + 1] if a.keep == 'largest' else [i + 1 for i, s in enumerate(sizes) if s >= 0.002 * sizes.max()]
    drop = ~np.isin(lab, keep) & solid
    alpha[drop] = 0
    notes.append('largest region kept' if a.keep == 'largest' else 'specks removed')
for ex in a.exclude:
    ex0, ey0, ex1, ey1 = ex; alpha[ey0:ey1, ex0:ex1] = 0; notes.append(f'alpha-only exclusion {ex}')
a8 = (alpha * 255).round().astype(np.uint8)
ys, xs = np.nonzero(a8)
bx0, by0, bx1, by1 = int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1
B = a.border
W, H = bx1 - bx0 + 2 * B, by1 - by0 + 2 * B
out = np.zeros((H, W, 4), np.uint8)
crop = roi[by0:by1, bx0:bx1]; ca = a8[by0:by1, bx0:bx1]
out[B:B + by1 - by0, B:B + bx1 - bx0, :3] = np.where(ca[..., None] > 0, crop[..., :3], 0)
out[B:B + by1 - by0, B:B + bx1 - bx0, 3] = ca
Image.fromarray(out, 'RGBA').save(f'{a.out}/prepared.png', optimize=True)
Image.fromarray(a8, 'L').save(f'{a.out}/mask-roi.png', optimize=True)
sha = lambda f: hashlib.sha256(open(f, 'rb').read()).hexdigest()
touch_edge = bx0 == 0 or by0 == 0 or bx1 == roi.shape[1] or by1 == roi.shape[0]
print(json.dumps({'roi': [x0, y0, x1, y1], 'bbox': [bx0, by0, bx1, by1], 'border': B, 'size': [W, H],
                  'native_alpha': a.alpha != 'model', 'refinement': '; '.join(notes),
                  'original_sha256': sha(a.original), 'prepared_sha256': sha(f'{a.out}/prepared.png'),
                  'mask_sha256': sha(f'{a.out}/mask-roi.png'), 'touches_roi_edge': touch_edge}))
