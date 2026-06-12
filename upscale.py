import os, shutil, sys, time
import torch
from PIL import Image
import numpy as np
from spandrel import ModelLoader

IMG_DIR = "assets/img"
BACKUP = os.path.join(IMG_DIR, "originals")
MODEL = ".sr-models/RealESRGAN_x4plus.pth"

# Only photographic product images. Leave logo.png and favicon.svg untouched.
TARGETS = [
    "cocopeat-block.jpg", "cocopeat-briquettes.jpg",
    "growbag.jpg", "growbag-expanded.jpg",
    "coirfiber-brown.jpg", "coirfiber-yellow.jpg",
    "huskchips.jpg", "huskchips-block.jpg",
    "coirrope.jpg", "coirrope-stacked.jpg",
]

device = "mps" if torch.backends.mps.is_available() else "cpu"
print("device:", device)

# SAFE LOAD: weights_only=True reads tensors only — pickle cannot execute code.
state = torch.load(MODEL, map_location="cpu", weights_only=True)
if isinstance(state, dict) and "params_ema" in state:
    state = state["params_ema"]
elif isinstance(state, dict) and "params" in state:
    state = state["params"]
model = ModelLoader().load_from_state_dict(state)
model.eval().to(device)
print("model scale:", model.scale)

os.makedirs(BACKUP, exist_ok=True)

def run(model, t):
    with torch.no_grad():
        return model(t)

for name in TARGETS:
    src = os.path.join(IMG_DIR, name)
    if not os.path.exists(src):
        print("MISSING", name); continue
    # back up original once
    bak = os.path.join(BACKUP, name)
    if not os.path.exists(bak):
        shutil.copy2(src, bak)

    img = Image.open(bak).convert("RGB")  # always upscale from the pristine original
    w, h = img.size
    arr = np.asarray(img).astype(np.float32) / 255.0
    t = torch.from_numpy(arr).permute(2, 0, 1).unsqueeze(0).to(device)
    start = time.time()
    try:
        out = run(model, t)
    except Exception as e:
        print("MPS failed on", name, "->", e, "| retrying on CPU")
        out = run(model.to("cpu"), t.to("cpu"))
        model.to(device)
    out = out.squeeze(0).clamp(0, 1).permute(1, 2, 0).cpu().numpy()
    out = (out * 255.0 + 0.5).astype(np.uint8)
    res = Image.fromarray(out)
    res.save(src, "JPEG", quality=92, optimize=True, progressive=True)
    print(f"{name}: {w}x{h} -> {res.size[0]}x{res.size[1]}  ({time.time()-start:.1f}s)")

print("DONE")
