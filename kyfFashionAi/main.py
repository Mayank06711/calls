"""
KYF Fashion AI Service - FastAPI Server

Provides image processing services for wardrobe management:
- Background removal (person photos: YOLO+cloth_seg, product photos: u2netp)
- Color extraction
- Flat-lay outfit generation

Security: All endpoints require X-Internal-Service-Key header (proxied from Node.js)
"""
import time
import io
import logging
from datetime import datetime
from typing import Optional
import requests
from PIL import Image

from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from rembg import new_session
import cloudinary
import cloudinary.uploader

import json
import cv2
import numpy as np

from config import settings, TYPE_TO_SLOT
from models.requests import ProcessItemRequest, GenerateFlatlayRequest, AnalyzeStyleDNARequest
from models.responses import (
    ProcessItemResponse, GenerateFlatlayResponse, HealthResponse, ErrorResponse,
    ColorInfo, ProcessingMeta, OutfitColorInfo, StyleDNAResponse
)
from services.processor import process_person_bg_only, process_product_photo
from services.colors import extract_colors_from_nobg
from services.flatlay import draw_flat_lay
from utils.image_utils import crop_to_content
from utils.security import validate_internal_request

# ══════════════════════════════════════════════════════════════
#  Logging Setup
# ══════════════════════════════════════════════════════════════

logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] %(levelname)s - %(message)s',
    datefmt='%H:%M:%S'
)
logger = logging.getLogger(__name__)

# ══════════════════════════════════════════════════════════════
#  FastAPI App
# ══════════════════════════════════════════════════════════════

app = FastAPI(
    title="KYF Fashion AI Service",
    version="1.0.0",
    description="Background removal, color extraction, and flat-lay generation for wardrobe management"
)

# CORS (only needed for direct client access during development)
# In production, this service should only be accessed by Node.js server
if settings.ENV == "development":
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.ALLOWED_ORIGINS.split(","),
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# ══════════════════════════════════════════════════════════════
#  Global State (Models & Sessions)
# ══════════════════════════════════════════════════════════════

# Rembg sessions (loaded on startup)
u2netp_session: Optional[any] = None    # Product photos: bg removal (~50MB)
silueta_session: Optional[any] = None   # Person photos: bg-only removal, keeps person (~150MB)

# Cloudinary configuration
cloudinary.config(
    cloud_name=settings.CLOUDINARY_CLOUD_NAME,
    api_key=settings.CLOUDINARY_API_KEY,
    api_secret=settings.CLOUDINARY_API_SECRET
)

# ══════════════════════════════════════════════════════════════
#  Startup & Shutdown
# ══════════════════════════════════════════════════════════════

@app.on_event("startup")
async def startup_event():
    """Load rembg sessions on startup."""
    global u2netp_session, silueta_session

    logger.info("Starting KYF Fashion AI Service...")
    logger.info(f"Environment: {settings.ENV}")
    logger.info(f"Port: {settings.PORT}")

    # Load u2netp (product photos: removes background, keeps product)
    logger.info("Loading u2netp session (~50MB)...")
    t0 = time.time()
    u2netp_session = new_session("u2netp")
    logger.info(f"✓ u2netp loaded in {time.time() - t0:.1f}s")

    # Load silueta (person photos: removes background only, keeps full person+garment)
    logger.info("Loading silueta session (~150MB)...")
    t0 = time.time()
    silueta_session = new_session("silueta")
    logger.info(f"✓ silueta loaded in {time.time() - t0:.1f}s")

    logger.info("✓ Service ready (~200MB total)")


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown."""
    logger.info("Shutting down KYF Fashion AI Service...")

# ══════════════════════════════════════════════════════════════
#  Helper Functions
# ══════════════════════════════════════════════════════════════

def download_image(url: str) -> Image.Image:
    """
    Download image from URL.

    Args:
        url: Image URL (Cloudinary or other)

    Returns:
        PIL Image in RGBA mode

    Raises:
        HTTPException: If download fails
    """
    try:
        response = requests.get(url, timeout=30)
        response.raise_for_status()
        img = Image.open(io.BytesIO(response.content)).convert("RGBA")
        return img
    except Exception as e:
        logger.error(f"Failed to download image from {url}: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to download image: {str(e)}"
        )


def upload_to_cloudinary(img: Image.Image, public_id_prefix: str, folder: str = None) -> str:
    """
    Upload PIL Image to Cloudinary.

    Args:
        img: PIL Image to upload
        public_id_prefix: Prefix for public_id (e.g., "item_abc123_nobg")
        folder: Cloudinary folder (default: settings.CLOUDINARY_UPLOAD_FOLDER)

    Returns:
        Cloudinary secure_url

    Raises:
        HTTPException: If upload fails
    """
    try:
        # Convert PIL Image to bytes
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        buf.seek(0)

        # Upload to Cloudinary
        result = cloudinary.uploader.upload(
            buf,
            folder=folder or settings.CLOUDINARY_UPLOAD_FOLDER,
            public_id=public_id_prefix,
            format="png",
            resource_type="image"
        )

        return result["secure_url"]
    except Exception as e:
        logger.error(f"Failed to upload to Cloudinary: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload to Cloudinary: {str(e)}"
        )

# ══════════════════════════════════════════════════════════════
#  Endpoints
# ══════════════════════════════════════════════════════════════

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """
    Health check endpoint (no auth required).

    Returns service status and model loading state.
    """
    return HealthResponse(
        status="ok",
        version="1.0.0",
        modelsLoaded=u2netp_session is not None and silueta_session is not None,
        timestamp=datetime.utcnow()
    )


@app.post(
    "/api/v1/process-item",
    response_model=ProcessItemResponse,
    dependencies=[Depends(validate_internal_request)]
)
async def process_item(request: ProcessItemRequest):
    """
    Process a single clothing item: remove background and extract colors.

    Security: Requires X-Internal-Service-Key header (proxied from Node.js server).

    Process flow:
    1. Download image from photoUrl (Cloudinary)
    2. Remove background: silueta (person photo) or u2netp (product photo)
    3. Crop to content bounding box
    4. Extract dominant colors (4 colors, skin-filtered for person photos)
    5. Upload nobg image to Cloudinary
    6. Return nobgUrl, colors, and processing metadata
    """
    start_time = time.time()
    logger.info(f"Processing item: {request.itemId} (type={request.itemType}, person={request.hasPersonInPhoto})")

    try:
        # 1. Download image
        logger.info(f"Downloading from {request.photoUrl}")
        input_img = download_image(str(request.photoUrl))
        orig_w, orig_h = input_img.size
        logger.info(f"Downloaded: {orig_w}x{orig_h}")

        # 2. Remove background
        # Person photos: silueta (removes bg only, keeps full person+garment intact)
        # Product photos: u2netp (removes bg, keeps product)
        if request.hasPersonInPhoto:
            logger.info("Using silueta (person photo, bg-only removal)")
            nobg_img, method = process_person_bg_only(input_img, silueta_session)
        else:
            logger.info("Using u2netp (product photo)")
            nobg_img, method = process_product_photo(input_img, u2netp_session)

        logger.info(f"Background removed: method={method}")

        # 3. Crop to content
        nobg_img = crop_to_content(nobg_img, alpha_threshold=100)
        cropped_w, cropped_h = nobg_img.size
        logger.info(f"Cropped: {orig_w}x{orig_h} -> {cropped_w}x{cropped_h}")

        # 4. Extract colors (filter skin tones for person photos)
        colors_raw = extract_colors_from_nobg(
            nobg_img, color_count=4, filter_skin=request.hasPersonInPhoto
        )
        colors = [ColorInfo(**c) for c in colors_raw]
        logger.info(f"Extracted colors: {[c.hex for c in colors]}")

        # 5. Upload to Cloudinary
        public_id = f"{request.itemId}_nobg"
        logger.info(f"Uploading to Cloudinary: {public_id}")
        nobg_url = upload_to_cloudinary(nobg_img, public_id)
        logger.info(f"Uploaded: {nobg_url}")

        # 6. Build response
        processing_time_ms = int((time.time() - start_time) * 1000)

        response = ProcessItemResponse(
            itemId=request.itemId,
            nobgUrl=nobg_url,
            dominantColors=colors,
            processingMeta=ProcessingMeta(
                method=method,
                originalDimensions={"width": orig_w, "height": orig_h},
                croppedDimensions={"width": cropped_w, "height": cropped_h},
                processedAt=datetime.utcnow(),
                processingTimeMs=processing_time_ms,
            ),
            success=True
        )

        logger.info(f"✓ Processing complete: {processing_time_ms}ms")
        return response

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Processing failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Processing failed: {str(e)}"
        )


@app.post(
    "/api/v1/generate-flatlay",
    response_model=GenerateFlatlayResponse,
    dependencies=[Depends(validate_internal_request)]
)
async def generate_flatlay(request: GenerateFlatlayRequest):
    """
    Generate flat-lay preview from multiple clothing items.

    Security: Requires X-Internal-Service-Key header (proxied from Node.js server).

    Process flow:
    1. Download nobg images for all items
    2. Organize items by slot (top, bottom, layer, footwear)
    3. Compose flat-lay with adaptive positioning and shadows
    4. Draw color palette on right side (1 color per slot)
    5. Upload flat-lay to Cloudinary
    6. Return flatlayUrl and color palette

    Args:
        request: GenerateFlatlayRequest with items, canvasSize, includePalette, bgColor

    Returns:
        GenerateFlatlayResponse with flatlayUrl and colorPalette
    """
    start_time = time.time()
    logger.info(f"Generating flat-lay: {len(request.items)} items, canvas={request.canvasSize}")

    try:
        # 1. Download nobg images and organize by slot
        items_dict = {}

        for item in request.items:
            logger.info(f"Downloading item: {item.itemId} (type={item.itemType})")
            nobg_img = download_image(str(item.nobgUrl))

            # Map type to slot
            slot = TYPE_TO_SLOT.get(item.itemType, "top")

            # Store as (img, colors) tuple
            items_dict[slot] = (nobg_img, item.dominantColors)

        logger.info(f"Downloaded {len(items_dict)} items: {list(items_dict.keys())}")

        # 2. Prepare background color
        bg_color = tuple(request.bgColor) if request.bgColor else (245, 245, 240)

        # 3. Generate flat-lay
        logger.info(f"Composing flat-lay: canvas={request.canvasSize}, bg={bg_color}")
        flatlay_img = draw_flat_lay(
            items=items_dict,
            canvas_size=request.canvasSize,
            bg_color=bg_color,
            include_palette=request.includePalette
        )

        logger.info("Flat-lay composed successfully")

        # 4. Upload to Cloudinary
        public_id_prefix = f"flatlay_{request.outfitId}" if request.outfitId else f"flatlay_{int(time.time())}"
        logger.info(f"Uploading flat-lay: {public_id_prefix}")
        flatlay_url = upload_to_cloudinary(flatlay_img, public_id_prefix)
        logger.info(f"Uploaded: {flatlay_url}")

        # 5. Build color palette (1 dominant color per slot)
        color_palette = []
        for slot, (img, colors) in items_dict.items():
            if colors and len(colors) > 0:
                dominant = colors[0]
                is_dict = isinstance(dominant, dict)
                color_palette.append(OutfitColorInfo(
                    hex=dominant.get("hex") if is_dict else dominant.hex,
                    rgb=dominant.get("rgb") if is_dict else dominant.rgb,
                    name=dominant.get("name") if is_dict else dominant.name,
                    colorFamily=(dominant.get("colorFamily") if is_dict else getattr(dominant, "colorFamily", None)),
                    colorType=(dominant.get("colorType") if is_dict else getattr(dominant, "colorType", None)),
                    slot=slot
                ))

        # 6. Build response
        processing_time_ms = int((time.time() - start_time) * 1000)

        response = GenerateFlatlayResponse(
            outfitId=request.outfitId,
            flatlayUrl=flatlay_url,
            colorPalette=color_palette,
            generatedAt=datetime.utcnow(),
            canvasSize=request.canvasSize,
            itemCount=len(items_dict),
            success=True
        )

        logger.info(f"✓ Flat-lay generated: {processing_time_ms}ms")
        return response

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Flat-lay generation failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Flat-lay generation failed: {str(e)}"
        )

# ══════════════════════════════════════════════════════════════
#  Style DNA Analysis
# ══════════════════════════════════════════════════════════════

@app.post(
    "/api/v1/analyze-style-dna",
    response_model=StyleDNAResponse,
    dependencies=[Depends(validate_internal_request)]
)
async def analyze_style_dna_endpoint(request: AnalyzeStyleDNARequest):
    """
    Analyze a user's photo for Style DNA (body, face, skin, hair, color season).

    Security: Requires X-Internal-Service-Key header (proxied from Node.js server).

    Process flow:
    1. Download image from thumbnailUrl (preferred) or imageUrl (fallback)
    2. Convert PIL → OpenCV BGR for pipeline
    3. Run full Style DNA pipeline (6 stages)
    4. Generate human-readable descriptions
    5. Return analysis with confidence scores and warnings

    Args:
        request: AnalyzeStyleDNARequest with userId, imageUrl, thumbnailUrl

    Returns:
        StyleDNAResponse with body, face, skin, hair, eyes, colorSeason, descriptions
    """
    from services.style_dna.pipeline import analyze_style_dna
    from services.style_dna.descriptions import generate_descriptions

    start_time = time.time()
    logger.info(f"═══ Style DNA Analysis: user={request.userId} ═══")

    try:
        # 1. Download image — try thumbnail first (lower bandwidth)
        url_to_use = str(request.thumbnailUrl or request.imageUrl)
        logger.info(f"Downloading image from: {url_to_use}")
        try:
            pil_img = download_image(url_to_use)
        except HTTPException:
            # Thumbnail failed — fall back to original URL
            if request.thumbnailUrl:
                logger.info(f"Thumbnail download failed, falling back to original: {request.imageUrl}")
                pil_img = download_image(str(request.imageUrl))
            else:
                raise

        logger.info(f"Downloaded: {pil_img.size[0]}x{pil_img.size[1]}")

        # 2. Convert PIL RGBA → OpenCV BGR (pipeline expects BGR)
        img_rgb = np.array(pil_img.convert("RGB"))
        img_bgr = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2BGR)
        logger.info(f"Converted to BGR: {img_bgr.shape[1]}x{img_bgr.shape[0]}")

        # 3. Run Style DNA pipeline
        logger.info("Running Style DNA pipeline...")
        result = analyze_style_dna(image_bgr=img_bgr)

        # 4. Log comprehensive pipeline results
        total_ms = int((time.time() - start_time) * 1000)
        meta = result.get("_meta", {})
        timings = meta.get("timingsMs", {})

        logger.info(f"── Pipeline Results ──")
        logger.info(f"  Body:        {json.dumps(result.get('body'), default=str) if result.get('body') else 'None'}")
        logger.info(f"  Face:        {json.dumps(result.get('face'), default=str) if result.get('face') else 'None'}")
        logger.info(f"  Skin:        {json.dumps(result.get('skin'), default=str) if result.get('skin') else 'None'}")
        logger.info(f"  Hair:        {json.dumps(result.get('hair'), default=str) if result.get('hair') else 'None'}")
        logger.info(f"  Eyes:        {json.dumps(result.get('eyes'), default=str) if result.get('eyes') else 'None'}")
        logger.info(f"  ColorSeason: {json.dumps(result.get('colorSeason'), default=str) if result.get('colorSeason') else 'None'}")
        logger.info(f"  Confidence:  {result.get('confidence', {})}")
        logger.info(f"  Warnings:    {result.get('warnings', [])}")
        logger.info(f"  Stage timings: {timings}")
        logger.info(f"  Total time: {total_ms}ms")

        # 5. Generate human-readable descriptions
        descriptions = generate_descriptions(result)
        logger.info(f"  Summary: {descriptions.get('summary', 'N/A')}")

        # 6. Build response
        response = StyleDNAResponse(
            userId=request.userId,
            body=result.get("body"),
            face=result.get("face"),
            eyes=result.get("eyes"),
            skin=result.get("skin"),
            hair=result.get("hair"),
            colorSeason=result.get("colorSeason"),
            confidence=result.get("confidence"),
            warnings=result.get("warnings"),
            descriptions=descriptions,
            meta=meta,
            success=True,
        )

        logger.info(f"✓ Style DNA analysis complete: {total_ms}ms")
        return response

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Style DNA analysis failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Style DNA analysis failed: {str(e)}"
        )


# ══════════════════════════════════════════════════════════════
#  Run Server
# ══════════════════════════════════════════════════════════════

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=settings.PORT,
        reload=(settings.ENV == "development")
    )
