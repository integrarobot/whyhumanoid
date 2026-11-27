# Non-generative alpha mask for an opaque original (Javier, 27 Nov 2026: "usa recorte no generativo por máscara").
# Runs the BiRefNet general segmentation model through rembg and saves ONLY the mask (a greyscale PNG); the original's
# pixels are not touched here. The mask is kept next to the original so the cutout reproduces without the 1 GB model.
#   python3 mask.py original.jpg mask.png
# Model: rembg 2.0.87 session "birefnet-general", file BiRefNet-general-epoch_244.onnx
# (sha256 58f621f00f5d756097615970a88a791584600dcf7c45b18a0a6267535a1ebd3c), from the rembg GitHub release v0.0.0.
import sys, json, hashlib
from PIL import Image
from rembg import new_session, remove
src, dst = sys.argv[1:3]
img = Image.open(src).convert('RGB')
mask = remove(img, session=new_session('birefnet-general'), only_mask=True, post_process_mask=False)
mask.save(dst, optimize=True)
print(json.dumps({'source': src, 'source_sha256': hashlib.sha256(open(src, 'rb').read()).hexdigest(), 'mask': dst,
                  'mask_sha256': hashlib.sha256(open(dst, 'rb').read()).hexdigest(), 'size': list(mask.size), 'model': 'birefnet-general'}))
