# Intake check of a candidate original or delivered cutout, before anything is made from it. Reads only; changes nothing.
#   python3 intake.py file [file ...]        one JSON report per file
# Reports what decides whether a file can be used as delivered: real transparency (an alpha channel or a palette with
# transparency, and its range), transparent corners, how close the figure comes to each edge (a figure touching an edge
# may be cropped, so not full body), and the separate opaque regions (a ball, a person, a second robot or lettering
# show up as extra regions). It does not judge identity or pose: that is a human review on light and dark grounds.
import sys, json, hashlib
import numpy as np
from PIL import Image
from scipy import ndimage

def report(path):
    raw = open(path, 'rb').read()
    im = Image.open(path)
    out = {'file': path, 'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest(), 'format': im.format,
           'mode': im.mode, 'size': list(im.size)}
    has_alpha = im.mode in ('RGBA', 'LA', 'PA') or (im.mode == 'P' and 'transparency' in im.info) or 'transparency' in im.info
    out['alpha_channel'] = bool(has_alpha)
    a = np.asarray(im.convert('RGBA'))[..., 3].astype(np.int32)
    H, W = a.shape
    out['alpha_min'], out['alpha_max'] = int(a.min()), int(a.max())
    out['alpha_levels'] = int(np.unique(a).size)
    out['transparent_share'] = round(float((a == 0).mean()), 4)
    out['semi_share'] = round(float(((a > 0) & (a < 255)).mean()), 4)
    out['corners_alpha'] = [int(a[0, 0]), int(a[0, W - 1]), int(a[H - 1, 0]), int(a[H - 1, W - 1])]
    usable = has_alpha and out['alpha_min'] == 0 and out['alpha_max'] == 255 and max(out['corners_alpha']) == 0
    solid = a > 127
    if solid.any():
        ys, xs = np.where(solid)
        out['figure_box'] = [int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1]
        out['margins_px'] = {'left': int(xs.min()), 'top': int(ys.min()), 'right': int(W - 1 - xs.max()), 'bottom': int(H - 1 - ys.max())}
        out['touches_edge'] = [k for k, v in out['margins_px'].items() if v == 0]
        lab, n = ndimage.label(solid)
        sizes = sorted((int(s) for s in ndimage.sum(solid, lab, range(1, n + 1))), reverse=True)
        out['opaque_regions'] = n
        out['largest_regions_px'] = sizes[:5]
        out['other_regions_share'] = round(sum(sizes[1:]) / sum(sizes), 4) if sizes else 0
    else:
        out['figure_box'] = None; out['touches_edge'] = []; out['opaque_regions'] = 0
    flags = []
    if not has_alpha: flags.append('no transparency: opaque file, needs a cutout')
    elif not usable: flags.append('transparency present but not clean (alpha range or corners)')
    if out['touches_edge']: flags.append('figure touches ' + ', '.join(out['touches_edge']) + ': check it is not cropped')
    if out.get('other_regions_share', 0) > 0.01: flags.append('more than one opaque region above 1 %: check for props, people, lettering or detached parts')
    if H < 500: flags.append('under 500 px tall')
    out['flags'] = flags
    return out

if __name__ == '__main__':
    for p in sys.argv[1:]:
        print(json.dumps(report(p), ensure_ascii=False))
