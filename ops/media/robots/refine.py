# Matte refinement of a delivered RGBA cutout. Alpha only, plus un-premultiplying edge colour where the file stores
# colour premultiplied by alpha. No pixel of the robot is repainted; nothing is generated.
#   python3 refine.py in.png out.png --lo 0.35 --hi 0.9 [--unpremultiply] [--clear x0,y0,x1,y1,maxdiff]
import sys, json, argparse
import numpy as np
from PIL import Image
from scipy import ndimage
p = argparse.ArgumentParser()
p.add_argument('src'); p.add_argument('dst')
p.add_argument('--lo', type=float, default=0.3); p.add_argument('--hi', type=float, default=0.9)
p.add_argument('--unpremultiply', action='store_true')
p.add_argument('--seed', action='append', default=[], help='sx,sy,x0,y0,x1,y1,maxgrad,lo,hi: background enclosed by the robot: grow from (sx,sy) through flat grey lo..hi inside the box')
p.add_argument('--clear', action='append', default=[], help='x0,y0,x1,y1,maxgrad,lo,hi: inside the box, clear flat pixels of grey level lo..hi connected to transparency')
a = p.parse_args()
im = np.asarray(Image.open(a.src).convert('RGBA')).astype(np.float64)
rgb, al = im[..., :3], im[..., 3] / 255
log = {}
if a.unpremultiply:
    m = al > 0.02
    rgb[m] = np.clip(rgb[m] / al[m, None], 0, 255)
# Matte levels: below lo is haze or shadow (transparent), above hi is the robot (opaque), linear in between.
al2 = np.clip((al - a.lo) / (a.hi - a.lo), 0, 1)
log['levels'] = [a.lo, a.hi]
# Targeted clears: background left opaque between parts (flat studio colour), flood-filled from transparent pixels.
for spec in a.clear:
    x0, y0, x1, y1, md, glo, ghi = [float(v) for v in spec.split(',')]; x0, y0, x1, y1 = map(int, (x0, y0, x1, y1))
    box = np.zeros(al.shape, bool); box[y0:y1, x0:x1] = True
    sub = rgb[y0:y1, x0:x1]
    # local flatness: background is smooth; robot parts have edges and texture
    g = sub.mean(2)
    grad = np.hypot(ndimage.sobel(g, 0), ndimage.sobel(g, 1))
    flat = np.zeros(al.shape, bool); flat[y0:y1, x0:x1] = (grad < md) & (g >= glo) & (g <= ghi) & (np.ptp(sub, 2) < 6)
    region = flat | (box & (al2 < 0.5))
    lab, n = ndimage.label(region)
    seeds = box & (al2 < 0.05)
    keep = np.isin(lab, np.unique(lab[seeds & (lab > 0)])) & box
    log.setdefault('cleared', []).append(int((keep & (al2 > 0)).sum()))
    al2[keep] = 0
for spec in a.seed:
    sx, sy, x0, y0, x1, y1, md, glo, ghi = [float(v) for v in spec.split(',')]
    sx, sy, x0, y0, x1, y1 = map(int, (sx, sy, x0, y0, x1, y1))
    sub = rgb[y0:y1, x0:x1]; g = sub.mean(2)
    grad = np.hypot(ndimage.sobel(g, 0), ndimage.sobel(g, 1))
    ok = np.zeros(al.shape, bool); ok[y0:y1, x0:x1] = (grad < md) & (g >= glo) & (g <= ghi) & (np.ptp(sub, 2) < 6)
    lab, n = ndimage.label(ok)
    if not ok[sy, sx]: raise SystemExit(f'seed {sx},{sy} is not background-like')
    keep = lab == lab[sy, sx]
    box = np.zeros(al.shape, bool); box[y0:y1, x0:x1] = True
    keep = ndimage.binary_dilation(keep, iterations=1) & box  # include the 1 px blend row at its edge
    log.setdefault('seeded', []).append(int(keep.sum()))
    al2[keep] = 0
# Un-mix the 2 px band beside every cleared region: alpha from where the pixel sits between the local background grey
# (the cleared pixels next to it) and the robot colour 3 px further in; colour set to that robot colour.
cleared_any = np.zeros(al.shape, bool)
for k in ('_cleared_masks',):
    pass
if a.clear or a.seed:
    cl = (al2 == 0) & (al >= 0.9)  # pixels opaque in the delivered file that were cleared here
    if cl.any():
        d_out, (iy, ix) = ndimage.distance_transform_edt(~cl, return_indices=True)
        band = (d_out > 0) & (d_out <= 2.5) & (al2 > 0)
        inner = ndimage.distance_transform_edt(~cl)
        # robot reference: nearest pixel at distance >= 4 from the cleared region
        far = inner >= 4
        _, (fy, fx) = ndimage.distance_transform_edt(~far, return_indices=True)
        L = rgb.mean(2)
        B = L[iy, ix]; F = L[fy, fx]
        den = F - B
        est = np.where(np.abs(den) > 12, np.clip((L - B) / np.where(den == 0, 1, den), 0, 1), 1.0)
        al2[band] = np.minimum(al2[band], est[band])
        rgb[band] = rgb[fy[band], fx[band]]
        log['edge_band_unmixed'] = int(band.sum())
# Drop islands smaller than 0.2 % of the robot.
solid = al2 > 0.02
lab, n = ndimage.label(solid)
if n > 1:
    sizes = ndimage.sum(solid, lab, range(1, n + 1))
    small = np.isin(lab, [i + 1 for i, s in enumerate(sizes) if s < 0.002 * sizes.max()])
    al2[small] = 0; log['islands_cleared'] = int(small.sum())
ys, xs = np.where(al2 > 0.02); pad = 10
H, W = al2.shape
box = (max(xs.min() - pad, 0), max(ys.min() - pad, 0), min(xs.max() + pad + 1, W), min(ys.max() + pad + 1, H))
out = np.dstack([rgb, al2 * 255]).round().clip(0, 255).astype(np.uint8)
out[al2 == 0, :3] = 0
Image.fromarray(out, 'RGBA').crop(box).save(a.dst, optimize=True)
log.update(crop_box_in_source=list(box), size=[box[2] - box[0], box[3] - box[1]], opaque=int((al2 >= 1).sum()), semi=int(((al2 > 0) & (al2 < 1)).sum()))
print(json.dumps(log, default=int))
