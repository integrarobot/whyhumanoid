# WebP twin of a published robot PNG: lossy colour at quality 90, lossless alpha, method 6, exact (colour under
# transparent pixels kept as in the PNG). With Pillow 12.3.0 this reproduces byte for byte, from their PNGs, the
# published WebP files of Digit 5, Apollo 2, Atlas, Figure 03, Optimus Gen 2 and H1 (23 Nov 2026 batch). NEO's WebP
# (made earlier, ops/media/robots/1x-neo) was encoded differently and is not reproduced by this recipe.
#   python3 to-webp.py in.png out.webp
import sys
from PIL import Image
Image.open(sys.argv[1]).save(sys.argv[2], 'WEBP', quality=90, alpha_quality=100, method=6, exact=True)
