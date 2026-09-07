"""
Engineering Drawing Digitization API
FastAPI backend for detecting shapes and text in engineering drawings.
"""                                                                                                                                                                                                      
import io
import base64
import tempfile
import os
from typing import List, Dict, Any
from pathlib import Path

import cv2
import numpy as np
import re
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import svgwrite

# EasyOCR is heavy to import, so we do it lazily
try:
    import easyocr
    EASYOCR_AVAILABLE = True
except ImportError:
    EASYOCR_AVAILABLE = False
    print("WARNING: EasyOCR not installed. Text detection will be disabled.")

app = FastAPI(
    title="Drawing Digitizer API",
    description="Convert engineering drawings (JPG/PNG) to SVG with detected shapes and text",
    version="1.1.0"
)

# CORS - allow React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3004", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global EasyOCR reader (initialized on first use)
_reader = None

def get_ocr_reader():
    global _reader
    if _reader is None and EASYOCR_AVAILABLE:
        print("Initializing EasyOCR (this may take a moment)...")
        _reader = easyocr.Reader(['en'], gpu=False)
    return _reader


class DetectionResult(BaseModel):
    shapes: List[Dict[str, Any]]
    text_blocks: List[Dict[str, Any]]
    svg: str
    original_width: int
    original_height: int


# ───────────────────────────────────────────────
# Preprocessing Helpers
# ───────────────────────────────────────────────

# def preprocess_for_circles(gray_img: np.ndarray) -> np.ndarray:
#     """Apply noise reduction before circle detection."""
#     # Median blur is better than Gaussian for removing salt-and-pepper noise
#     # while preserving edges
#     blurred = cv2.medianBlur(gray_img, 5)
#     return blurred


def preprocess_for_lines(gray_img: np.ndarray) -> np.ndarray:
    """Edge detection for Hough Lines."""
    # edges = cv2.Canny(gray_img, 50, 150, apertureSize=3)
    # return edges
    edges = cv2.Canny(
    gray_img,
    50,
    150,
    apertureSize=3
    )
    cv2.imwrite(
    "03_edges.png",
    edges)
    return edges

def extract_walls(gray):

    thresh = cv2.adaptiveThreshold(
        gray,
        255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY_INV,
        11,
        2
    )

    horizontal_kernel = cv2.getStructuringElement(
        cv2.MORPH_RECT,
        (25, 1)
    )

    vertical_kernel = cv2.getStructuringElement(
        cv2.MORPH_RECT,
        (1, 25)
    )

    horizontal = cv2.morphologyEx(
        thresh,
        cv2.MORPH_OPEN,
        horizontal_kernel
    )

    vertical = cv2.morphologyEx(
        thresh,
        cv2.MORPH_OPEN,
        vertical_kernel
    )

    walls = cv2.bitwise_or(
        horizontal,
        vertical
    )

    cv2.imwrite(
        "04_walls.png",
        walls
    )

    return walls

# ───────────────────────────────────────────────
# Shape Detection Helpers
# ───────────────────────────────────────────────

def mask_text_regions(img, text_blocks):
    masked = img.copy()

    for tb in text_blocks:
        x = tb["x"]
        y = tb["y"] - tb["height"]
        w = tb["width"]
        h = tb["height"]

        cv2.rectangle(
            masked,
            (x - 5, y - 5),
            (x + w + 5, y + h + 5),
            (255, 255, 255),
            -1
        )

    return masked

def merge_lines(lines):
    merged = []

    for line in lines:
        duplicate = False

        for existing in merged:

            if (
                abs(line["x1"] - existing["x1"]) < 10
                and
                abs(line["y1"] - existing["y1"]) < 10
                and
                abs(line["x2"] - existing["x2"]) < 10
                and
                abs(line["y2"] - existing["y2"]) < 10
            ):
                duplicate = True
                break

        if not duplicate:
            merged.append(line)

    return merged

def detect_lines(gray_img: np.ndarray, color_img: np.ndarray) -> List[Dict]:
    """Detect straight lines using Hough Transform."""
    lines = []
    edges = preprocess_for_lines(gray_img)

    hough_lines = cv2.HoughLinesP(
        edges, 
        rho=1, 
        theta=np.pi/180, 
        threshold=120,
        minLineLength=80,
        maxLineGap=15
        # threshold=80,        # Increased threshold to reduce noise
        # minLineLength=40,    # Longer minimum line
        # maxLineGap=8         # Reduced gap to prevent connecting separate lines
    )

    if hough_lines is not None:
        for line in hough_lines[:150]:  # Limit output 40 --> 150 lines
            x1, y1, x2, y2 = line[0]
            lines.append({
                "type": "line",
                "x1": int(x1), "y1": int(y1),
                "x2": int(x2), "y2": int(y2),
                "stroke": "#2c3e50",
                "stroke_width": 2
            })
    return lines


def detect_rectangles(gray_img: np.ndarray) -> List[Dict]:
    """Detect rectangles and squares using contour approximation."""
    rects = []
    # Adaptive thresholding for better handling of varying lighting
    thresh = cv2.adaptiveThreshold(
        gray_img, 255, 
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
        cv2.THRESH_BINARY_INV, 
        11, 2
    )

    # Morphological closing to connect broken lines
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
    thresh = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel, iterations=1)

    # contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    contours, hierarchy = cv2.findContours(
    thresh,
    cv2.RETR_TREE,
    cv2.CHAIN_APPROX_SIMPLE)


    for cnt in contours:
        area = cv2.contourArea(cnt)
        # Filter tiny noise contours
        if area < 100:
            continue

        epsilon = 0.04 * cv2.arcLength(cnt, True)
        approx = cv2.approxPolyDP(cnt, epsilon, True)

        # Rectangle has 4 vertices
        if len(approx) == 4:
            x, y, w, h = cv2.boundingRect(approx)
            aspect_ratio = float(w) / h if h > 0 else 0

            # Filter out very small or very skewed detections
            if w > 25 and h > 25 and 0.2 < aspect_ratio < 5.0:
                bounding_area = w * h
                if bounding_area > 0 and (area / bounding_area) > 0.5:
                    rects.append({
                        "type": "rect",
                        "x": int(x),
                        "y": int(y),
                        "width": int(w),
                        "height": int(h),
                        "fill": "none",
                        "stroke": "#3498db",
                        "stroke_width": 2,
                        "rx": 0
                    })
    return rects


def detect_contours_from_combined(combined_img):

    contours_list = []

    contours, hierarchy = cv2.findContours(
        combined_img,
        cv2.RETR_TREE,
        cv2.CHAIN_APPROX_SIMPLE
    )

    for cnt in contours:

        area = cv2.contourArea(cnt)

        if area < 500:
            continue

        x, y, w, h = cv2.boundingRect(cnt)

        contours_list.append({
            "type": "rect",
            "x": int(x),
            "y": int(y),
            "width": int(w),
            "height": int(h),
            "fill": "none",
            "stroke": "#27ae60",
            "stroke_width": 2
        })

    return contours_list

# def detect_circles(gray_img: np.ndarray, color_img: np.ndarray) -> List[Dict]:
#     """Detect circles using Hough Circle Transform with noise reduction."""
#     circles_list = []

    # Preprocess: blur to reduce noise before HoughCircles
    # processed = preprocess_for_circles(gray_img)

    # HoughCircles with stricter parameters to reduce false positives
    # circles = cv2.HoughCircles(
    #     processed,
    #     cv2.HOUGH_GRADIENT,
    #     dp=1.2,              # Coarser accumulator = less noise-sensitive
    #     minDist=50,          # Minimum distance between circle centers
    #     param1=150,          # Higher Canny edge threshold
    #     param2=50,           # HIGHER accumulator threshold = stricter detection
    #     minRadius=15,        # Ignore tiny circles (noise)
    #     maxRadius=min(gray_img.shape[0], gray_img.shape[1]) // 3  # Cap max radius
    # )

    # if circles is not None:
    #     circles = np.uint16(np.around(circles))
    #     for c in circles[0, :]:
    #         x, y, r = int(c[0]), int(c[1]), int(c[2])

    #         # Additional validation: check if the detected circle actually has edges
    #         # by sampling points on the circumference
    #         if is_valid_circle(gray_img, x, y, r):
    #             circles_list.append({
    #                 "type": "circle",
    #                 "cx": x,
    #                 "cy": y,
    #                 "r": r,
    #                 "fill": "none",
    #                 "stroke": "#e74c3c",
    #                 "stroke_width": 2
    #             })

    # return circles_list


def is_valid_circle(gray_img: np.ndarray, cx: int, cy: int, r: int) -> bool:
    """Validate a detected circle by checking edge density on its circumference."""
    if r <= 0:
        return False

    # Sample points on the circle and check edge presence
    edge_count = 0
    total_samples = 16

    for i in range(total_samples):
        angle = 2 * np.pi * i / total_samples
        px = int(cx + r * np.cos(angle))
        py = int(cy + r * np.sin(angle))

        # Check bounds
        if 0 <= px < gray_img.shape[1] and 0 <= py < gray_img.shape[0]:
            # Check if point is on an edge (using simple gradient check)
            if gray_img[py, px] < 200:  # Dark pixel = likely edge
                edge_count += 1

    # Require at least 40% of sampled points to be on edges
    return edge_count >= (total_samples * 0.4)


def detect_text_easyocr(color_img: np.ndarray) -> List[Dict]:
    """Extract text using EasyOCR."""
    if not EASYOCR_AVAILABLE:
        return []

    reader = get_ocr_reader()
    if reader is None:
        return []

    results = reader.readtext(color_img, detail=1)
    text_blocks = []

    for (bbox, text, conf) in results:
        # if conf < 0.3:
        #     continue
        if conf < 0.6:
           continue

        text = text.strip()

       # Ignore single-character noise
        if len(text) < 2:
           continue
        
        if not (
            re.search(r"[A-Za-z]", text)
            or re.search(r"\d", text)
        ):
          continue

        pts = np.array(bbox, dtype=np.int32)
        x, y, w, h = cv2.boundingRect(pts)

        text_blocks.append({
            "type": "text",
            "x": int(x),
            "y": int(y + h),
            "text": text.strip(),
            "font_size": max(10, int(h * 0.8)),
            "fill": "#2c3e50",
            "confidence": float(conf),
            "width": int(w),
            "height": int(h)
        })

    return text_blocks


# ───────────────────────────────────────────────
# SVG Generation
# ───────────────────────────────────────────────

def generate_svg(shapes: List[Dict], text_blocks: List[Dict], width: int, height: int) -> str:
    """Generate SVG string from detected shapes and text."""
    dwg = svgwrite.Drawing(size=(width, height))

    # White background
    dwg.add(dwg.rect(insert=(0, 0), size=(width, height), fill="white"))

    # Subtle grid pattern
    # grid_group = dwg.g(id="grid", stroke="#ecf0f1", stroke_width=1)
    # grid_spacing = 50
    # for x in range(0, width, grid_spacing):
    #     grid_group.add(dwg.line(start=(x, 0), end=(x, height)))
    # for y in range(0, height, grid_spacing):
    #     grid_group.add(dwg.line(start=(0, y), end=(width, y)))
    # dwg.add(grid_group)

    # Shapes group
    shapes_group = dwg.g(id="shapes")
    for shape in shapes:
        if shape["type"] == "line":
            shapes_group.add(dwg.line(
                start=(shape["x1"], shape["y1"]),
                end=(shape["x2"], shape["y2"]),
                stroke=shape["stroke"],
                stroke_width=shape["stroke_width"]
            ))
        elif shape["type"] == "rect":
            shapes_group.add(dwg.rect(
                insert=(shape["x"], shape["y"]),
                size=(shape["width"], shape["height"]),
                fill=shape["fill"],
                stroke=shape["stroke"],
                stroke_width=shape["stroke_width"],
                rx=shape.get("rx", 0)
            ))
        elif shape["type"] == "circle":
            shapes_group.add(dwg.circle(
                center=(shape["cx"], shape["cy"]),
                r=shape["r"],
                fill=shape["fill"],
                stroke=shape["stroke"],
                stroke_width=shape["stroke_width"]
            ))
    dwg.add(shapes_group)

    # Text group
    text_group = dwg.g(id="text")
    for tb in text_blocks:
        text_group.add(dwg.text(
            tb["text"],
            insert=(tb["x"], tb["y"]),
            font_size=tb["font_size"],
            fill=tb["fill"],
            font_family="Arial, sans-serif",
            font_weight="bold"
        ))
    dwg.add(text_group)

    return dwg.tostring()


# ───────────────────────────────────────────────
# API Endpoints
# ───────────────────────────────────────────────

@app.post("/api/digitize", response_model=DetectionResult)
async def digitize_drawing(file: UploadFile = File(...)):
    """
    Upload a JPG/PNG engineering drawing and receive an SVG with detected shapes and text.
    """
    allowed_types = {"image/jpeg", "image/jpg", "image/png"}
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid file type: {file.content_type}. Only JPG and PNG are supported."
        )

    contents = await file.read()
    if len(contents) > 20 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Max 20MB.")

    nparr = np.frombuffer(contents, np.uint8)
    color_img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    if color_img is None:
        raise HTTPException(status_code=400, detail="Could not decode image. Ensure it's a valid JPG/PNG.")

    height, width = color_img.shape[:2]
    gray_img = cv2.cvtColor(color_img, cv2.COLOR_BGR2GRAY)
    cv2.imwrite("01_original.png", color_img)
# OCR first
    text_blocks = detect_text_easyocr(color_img)

# Remove text from image
    masked_color = mask_text_regions(color_img, text_blocks)
    masked_gray = cv2.cvtColor(masked_color, cv2.COLOR_BGR2GRAY)
    cv2.imwrite("02_masked.png", masked_color)
    walls = extract_walls(masked_gray)
    edges = preprocess_for_lines(masked_gray)
    combined = cv2.bitwise_or(
    edges,
    walls
    )
    cv2.imwrite(
    "05_combined.png",
    combined
    )
# Geometry after text removal
    # lines = detect_lines(masked_gray, masked_color)
    lines = detect_lines(
    masked_gray,
    masked_color)
    lines = merge_lines(lines)
    rectangles = detect_rectangles(masked_gray)
    combined_rectangles = detect_contours_from_combined(
    combined
    )
    # # ── Detection Pipeline ──
    # lines = detect_lines(gray_img, color_img)
    # rectangles = detect_rectangles(gray_img)
    # # circles = detect_circles(gray_img, color_img)
    # text_blocks = detect_text_easyocr(color_img)

    all_shapes = lines + rectangles #+ combined_rectangles # + circles

    svg_string = generate_svg(all_shapes, text_blocks, width, height)

    return DetectionResult(
        shapes=all_shapes,
        text_blocks=text_blocks,
        svg=svg_string,
        original_width=width,
        original_height=height
    )


@app.get("/api/health")
async def health_check():
    return {
        "status": "ok",
        "easyocr_available": EASYOCR_AVAILABLE,
        "opencv_version": cv2.__version__
    }


@app.get("/")
async def root():
    return {"message": "Drawing Digitizer API. POST /api/digitize with a JPG/PNG file."}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=4004)
