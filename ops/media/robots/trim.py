# Publishable PNG from an original that already carries real transparency: alpha and robot pixels are kept as they
# are. It only crops to the figure with a 10 px margin, zeroes the colour of fully transparent pixels, and, if the
# figure is taller than --max-height, scales it down (Pillow resamples RGBA premultiplied, so edges gain no halo).
# Nothing is repainted, generated or thresholded.
#   python3 trim.py original.png out.png [--max-height 1200] [--pad 10]
import json, argparse
import numpy as np
from PIL import Image
p = argparse.ArgumentParser()
p.add_argument('src'); p.add_argument('dst')
p.add_argument('--max-height', type=int, default=1200); p.add_argument('--pad', type=int, default=10)
a = p.parse_args()
im = Image.open(a.src).convert('RGBA')
al = np.asarray(im)[..., 3]
ys, xs = np.where(al > 0)
W, H = im.size
box = (max(int(xs.min()) - a.pad, 0), max(int(ys.min()) - a.pad, 0), min(int(xs.max()) + a.pad + 1, W), min(int(ys.max()) + a.pad + 1, H))
out = im.crop(box)
log = {'crop_box_in_source': list(box)}
if out.height > a.max_height:
    w = round(out.width * a.max_height / out.height)
    out = out.resize((w, a.max_height), Image.LANCZOS)
    log['scaled_to'] = [w, a.max_height]
px = np.asarray(out).copy()
px[px[..., 3] == 0, :3] = 0
Image.fromarray(px, 'RGBA').save(a.dst, optimize=True)
log['size'] = list(out.size)
print(json.dumps(log))
