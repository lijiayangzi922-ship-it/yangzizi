"""Optional local AI service. Photos are processed in memory; no image persistence."""
import io
import os
import threading
from functools import lru_cache
import cv2
import numpy as np
from PIL import Image, ImageOps, UnidentifiedImageError
from fastapi import FastAPI, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from starlette.concurrency import run_in_threadpool
from rembg import new_session, remove

app = FastAPI(title="LineCloset outline service", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=os.environ.get(
    "ALLOWED_ORIGINS", "http://localhost:4173,http://127.0.0.1:4173,capacitor://localhost,https://localhost"
).split(","), allow_methods=["GET", "POST"], allow_headers=["Content-Type"])
Image.MAX_IMAGE_PIXELS = 24_000_000
inference_lock = threading.Lock()

@lru_cache(maxsize=1)
def model():
    # Model weights download on first inference; subsequent inference is local.
    return new_session(os.environ.get("REMBG_MODEL", "u2net"))

def vectorize(image):
    image = ImageOps.exif_transpose(image).convert("RGB")
    image.thumbnail((1000, 1000))
    with inference_lock:
        rgba = np.array(remove(image, session=model()).convert("RGBA"))
    alpha = (rgba[:, :, 3] > 140).astype(np.uint8) * 255
    alpha = cv2.morphologyEx(alpha, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8))
    contours, _ = cv2.findContours(alpha, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        raise ValueError("未识别到衣物，请使用完整、对比清楚的单件照片")
    contour = max(contours, key=cv2.contourArea)
    if cv2.contourArea(contour) < 200:
        raise ValueError("衣物主体过小，请靠近后重新拍摄")
    x, y, w, h = cv2.boundingRect(contour)
    factor = min(204 / w, 184 / h)
    ox, oy = (240 - w * factor) / 2, (220 - h * factor) / 2

    def path(points, closed=False):
        points = points.reshape(-1, 2)
        d = " ".join(f"{'M' if i == 0 else 'L'}{(px-x)*factor+ox:.2f},{(py-y)*factor+oy:.2f}"
                     for i, (px, py) in enumerate(points))
        return f'<path d="{d}{" Z" if closed else ""}"/>'

    outer = cv2.approxPolyDP(contour, max(1.4, cv2.arcLength(contour, True) * 0.0015), True)
    result = [path(outer, True)]
    foreground = np.zeros_like(alpha)
    cv2.drawContours(foreground, [contour], -1, 255, cv2.FILLED)
    inner_mask = cv2.erode(foreground, np.ones((13, 13), np.uint8))
    # Edge-preserving smoothing suppresses fine textile texture before Canny.
    gray = cv2.cvtColor(rgba[:, :, :3], cv2.COLOR_RGB2GRAY)
    gray = cv2.bilateralFilter(gray, 13, 65, 65)
    gray = cv2.GaussianBlur(gray, (5, 5), 1.2)
    edges = cv2.Canny(gray, 65, 145)
    edges = cv2.bitwise_and(edges, inner_mask)
    structures, _ = cv2.findContours(edges, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
    structures = sorted(structures, key=lambda c: cv2.arcLength(c, False), reverse=True)
    # Candidates are not semantically guaranteed seams. User can erase folds.
    for candidate in structures[:18]:
        if cv2.arcLength(candidate, False) < max(w, h) * 0.12:
            continue
        simplified = cv2.approxPolyDP(candidate, 2.2, False)
        if len(simplified) >= 3:
            result.append(path(simplified))
    return "".join(result)

@app.get("/health")
def health():
    return {"status": "ok", "model": os.environ.get("REMBG_MODEL", "u2net")}

@app.post("/outline")
async def outline(file: UploadFile):
    raw = await file.read(12 * 1024 * 1024 + 1)
    await file.close()
    if len(raw) > 12 * 1024 * 1024:
        raise HTTPException(413, "图片不能超过 12 MB")
    try:
        image = Image.open(io.BytesIO(raw))
        image.load()
        svg = await run_in_threadpool(vectorize, image)
        return {"svg": svg, "viewBox": "0 0 240 220", "method": "u2net-and-structure-candidates"}
    except (UnidentifiedImageError, Image.DecompressionBombError, ValueError) as error:
        raise HTTPException(422, str(error)) from error
    except Exception as error:
        raise HTTPException(503, "AI 模型暂不可用，请检查服务端模型下载和运行环境") from error
