
import io
import os
import tempfile

import fitz  # PyMuPDF
import numpy as np
from PIL import Image
from colorspacious import cspace_convert

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

app = FastAPI(title="ChromaAssist PDF API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Development only
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------- EXISTING COLOUR-PROCESSING FUNCTIONS ----------

def map_to_displayable_rgb(simulated):
    simulated = np.asarray(simulated, dtype=np.float32)
    simulated = np.nan_to_num(
        simulated, nan=0.0, posinf=1.0, neginf=0.0
    )

    neutral = np.clip(
        np.mean(simulated, axis=-1, keepdims=True), 0.0, 1.0
    )
    low = np.zeros_like(neutral)
    high = np.ones_like(neutral)

    for _ in range(16):
        mid = (low + high) / 2.0
        candidate = neutral + mid * (simulated - neutral)
        fits = np.all(
            (candidate >= 0.0) & (candidate <= 1.0),
            axis=-1, keepdims=True
        )
        low = np.where(fits, mid, low)
        high = np.where(fits, high, mid)

    mapped = neutral + low * (simulated - neutral)
    return np.clip(mapped, 0.0, 1.0)


def enhance_colour_accessibility(image, cvd_type, severity=100):
    original = np.asarray(
        image.convert("RGB"), dtype=np.float32
    ) / 255.0

    cvd_space = {
        "name": "sRGB1+CVD",
        "cvd_type": cvd_type,
        "severity": int(severity),
    }

    simulated = cspace_convert(original, "sRGB1", cvd_space)
    simulated = map_to_displayable_rgb(simulated)
    error = original - simulated

    matrices = {
        "protanomaly": [
            [0.0, 0.0, 0.0],
            [0.7, 1.0, 0.0],
            [0.7, 0.0, 1.0],
        ],
        "deuteranomaly": [
            [1.0, 0.7, 0.0],
            [0.0, 0.0, 0.0],
            [0.0, 0.7, 1.0],
        ],
        "tritanomaly": [
            [1.0, 0.0, 0.7],
            [0.0, 1.0, 0.7],
            [0.0, 0.0, 0.0],
        ],
    }

    if cvd_type not in matrices:
        raise ValueError(f"Unknown profile: {cvd_type}")

    matrix = np.asarray(matrices[cvd_type], dtype=np.float32)
    correction = error @ matrix.T

    maximum = original.max(axis=2)
    minimum = original.min(axis=2)
    brightness = original.mean(axis=2)

    chromatic_mask = (
        ((maximum - minimum) > 0.10)
        & (brightness > 0.10)
        & (brightness < 0.92)
    )

    enhanced = original.copy()
    enhanced[chromatic_mask] = (
        original[chromatic_mask]
        + 0.50 * correction[chromatic_mask]
    )

    enhanced = np.clip(enhanced, 0.0, 1.0)

    return Image.fromarray(
        np.round(enhanced * 255).astype(np.uint8),
        mode="RGB",
    )


# ---------- API ----------

@app.get("/")
def home():
    return {"message": "ChromaAssist PDF backend is running!"}


@app.post("/process-pdf")
async def process_pdf(
    file: UploadFile = File(...),
    profile: str = Form("deuteranopia"),
    dpi: int = Form(120),
    max_pages: int = Form(30),
    severity: int = Form(100),
):
    profiles = {
        "protanopia": "protanomaly",
        "deuteranopia": "deuteranomaly",
        "tritanopia": "tritanomaly",
    }

    if profile not in profiles:
        raise HTTPException(400, "Invalid colour-vision profile.")

    if dpi not in (90, 120, 150):
        raise HTTPException(400, "DPI must be 90, 120, or 150.")

    if not 1 <= max_pages <= 1000:
        raise HTTPException(400, "Max pages must be between 1 and 1000.")

    if not 50 <= severity <= 100:
        raise HTTPException(400, "Severity must be between 50 and 100.")

    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(400, "Please upload a PDF file.")

    data = await file.read()

    if not data or not data.startswith(b"%PDF-"):
        raise HTTPException(400, "The uploaded file is not a valid PDF.")

    output = io.BytesIO()
    zoom = dpi / 72.0

    try:
        with fitz.open(stream=data, filetype="pdf") as source:
            if source.page_count == 0:
                raise HTTPException(400, "The PDF contains no pages.")

            if source.needs_pass:
                raise HTTPException(
                    400, "Password-protected PDFs are not supported."
                )

            output_doc = fitz.open()

            try:
                for page_number in range(min(source.page_count, max_pages)):
                    page = source.load_page(page_number)
                    pix = page.get_pixmap(
                        matrix=fitz.Matrix(zoom, zoom),
                        alpha=False,
                    )

                    page_image = Image.frombytes(
                        "RGB",
                        [pix.width, pix.height],
                        pix.samples,
                    )

                    enhanced_image = enhance_colour_accessibility(
                        page_image,
                        profiles[profile],
                        severity,
                    )

                    image_bytes = io.BytesIO()
                    enhanced_image.save(image_bytes, format="PNG")

                    new_page = output_doc.new_page(
                        width=page.rect.width,
                        height=page.rect.height,
                    )

                    new_page.insert_image(
                        new_page.rect,
                        stream=image_bytes.getvalue(),
                    )

                output_doc.save(output)
            finally:
                output_doc.close()

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=422,
            detail=f"Could not process this PDF: {exc}",
        ) from exc

    output.seek(0)

    return StreamingResponse(
        output,
        media_type="application/pdf",
        headers={
            "Content-Disposition": 'attachment; filename="chromaassist-result.pdf"'
        },
    )
