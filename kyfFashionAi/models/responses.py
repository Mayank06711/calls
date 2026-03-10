"""
Pydantic response models for FastAPI endpoints.
"""
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, HttpUrl
from datetime import datetime


class ColorInfo(BaseModel):
    """Color information."""
    hex: str = Field(..., description="Hex color code (#rrggbb)")
    rgb: List[int] = Field(..., description="RGB values [r, g, b]")
    name: str = Field(..., description="Common color name (e.g. navy, mustard, sage green)")
    colorFamily: Optional[str] = Field(None, description="Color family grouping (e.g. blue, green, red)")
    colorType: Optional[str] = Field(None, description="Color type (e.g. saturated color, pastel, dark color)")
    percentage: float = Field(..., description="Percentage of this color in image")


class ProcessingMeta(BaseModel):
    """Processing metadata for a single item."""
    method: str = Field(..., description="Background removal method used")
    originalDimensions: Dict[str, int] = Field(..., description="Original image dimensions")
    croppedDimensions: Dict[str, int] = Field(..., description="Cropped dimensions after bg removal")
    processedAt: datetime = Field(default_factory=datetime.utcnow, description="Processing timestamp")
    processingTimeMs: int = Field(..., description="Processing time in milliseconds")


class ProcessItemResponse(BaseModel):
    """
    Response from processing a single clothing item.
    
    This response includes:
    - nobgUrl: Cloudinary URL of background-removed image
    - dominantColors: List of dominant colors extracted
    - processingMeta: Metadata about the processing
    """
    itemId: str = Field(..., description="MongoDB _id of the clothing item")
    nobgUrl: HttpUrl = Field(..., description="Cloudinary URL of background-removed image")
    dominantColors: List[ColorInfo] = Field(..., description="Dominant colors (sorted by percentage)")
    processingMeta: ProcessingMeta = Field(..., description="Processing metadata")
    success: bool = Field(default=True, description="Processing success status")


class OutfitColorInfo(BaseModel):
    """Color information for outfit flat-lay."""
    hex: str = Field(..., description="Hex color code (#rrggbb)")
    rgb: List[int] = Field(..., description="RGB values [r, g, b]")
    name: str = Field(..., description="Common color name (e.g. navy, mustard, sage green)")
    colorFamily: Optional[str] = Field(None, description="Color family grouping (e.g. blue, green, red)")
    colorType: Optional[str] = Field(None, description="Color type (e.g. saturated color, pastel, dark color)")
    slot: str = Field(..., description="Slot name (top, bottom, layer, footwear)")


class GenerateFlatlayResponse(BaseModel):
    """
    Response from generating flat-lay preview.
    
    This response includes:
    - flatlayUrl: Cloudinary URL of generated flat-lay image
    - colorPalette: List of colors from all items (1 per slot)
    - generatedAt: Timestamp of generation
    """
    outfitId: Optional[str] = Field(None, description="MongoDB _id of outfit (if provided)")
    flatlayUrl: HttpUrl = Field(..., description="Cloudinary URL of flat-lay image")
    colorPalette: List[OutfitColorInfo] = Field(..., description="Color palette (1 color per slot)")
    generatedAt: datetime = Field(default_factory=datetime.utcnow, description="Generation timestamp")
    canvasSize: int = Field(..., description="Canvas size used")
    itemCount: int = Field(..., description="Number of items in flat-lay")
    success: bool = Field(default=True, description="Generation success status")


class HealthResponse(BaseModel):
    """Health check response."""
    status: str = Field(..., description="Service status (ok/degraded/error)")
    version: str = Field(..., description="Service version")
    modelsLoaded: bool = Field(..., description="Whether YOLO models are loaded")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Health check timestamp")


class ErrorResponse(BaseModel):
    """Error response."""
    error: str = Field(..., description="Error message")
    detail: Optional[str] = Field(None, description="Detailed error information")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Error timestamp")


# ══════════════════════════════════════════════════════════════
#  Style DNA Response Models
# ══════════════════════════════════════════════════════════════

class StyleDNABodyInfo(BaseModel):
    """Body analysis from pose estimation."""
    bodyShape: Optional[str] = Field(None, description="Body shape classification (inverted_triangle, pear, rectangle, etc.)")
    shoulderHipRatio: Optional[float] = Field(None, description="Shoulder-to-hip width ratio")
    torsoLegRatio: Optional[float] = Field(None, description="Torso-to-leg length ratio")


class StyleDNAFaceInfo(BaseModel):
    """Face analysis from InsightFace + MediaPipe."""
    estimatedAge: Optional[int] = Field(None, description="Estimated age (single value)")
    ageRange: Optional[List[int]] = Field(None, description="Age range [min, max]")
    ageConfidence: Optional[str] = Field(None, description="Age confidence: medium or low")
    gender: Optional[str] = Field(None, description="Detected gender: male or female")
    faceShape: Optional[str] = Field(None, description="Face shape (oval, round, square, heart, oblong, diamond)")
    eyeShape: Optional[str] = Field(None, description="Eye shape (almond, round, hooded, monolid, upturned, downturned)")
    noseProportion: Optional[str] = Field(None, description="Nose proportion (narrow, average, wide)")
    lipFullness: Optional[str] = Field(None, description="Lip fullness (thin, medium, full)")


class StyleDNAEyesInfo(BaseModel):
    """Eye details from face geometry + iris analysis."""
    shape: Optional[str] = Field(None, description="Eye shape classification")
    color: Optional[Dict[str, Any]] = Field(None, description="Iris color {name, hex, rgb}")


class StyleDNASkinInfo(BaseModel):
    """Skin analysis from face pixel sampling."""
    monkTone: Optional[int] = Field(None, description="Monk Skin Tone scale (1-10)")
    undertone: Optional[str] = Field(None, description="Skin undertone: warm, cool, or neutral")
    hex: Optional[str] = Field(None, description="Detected skin hex color")
    referenceHex: Optional[str] = Field(None, description="Reference Monk scale hex color")


class StyleDNAHairInfo(BaseModel):
    """Hair analysis from region above face."""
    type: Optional[str] = Field(None, description="Hair type (straight, wavy, curly, coily, bald)")
    color: Optional[Dict[str, Any]] = Field(None, description="Hair color {name, hex, rgb}")
    baldnessLevel: Optional[str] = Field(None, description="Baldness level if applicable")


class StyleDNAColorSeason(BaseModel):
    """Color season derived from skin, hair, and eye colors."""
    season: Optional[str] = Field(None, description="Season: Spring, Summer, Autumn, Winter")
    subSeason: Optional[str] = Field(None, description="Sub-season: e.g. Deep Autumn, Light Spring")
    palette: Optional[List[str]] = Field(None, description="Recommended color palette (hex values)")


class StyleDNAResponse(BaseModel):
    """Full Style DNA analysis response.

    Uses Dict[str, Any] for each section rather than strict sub-models so that
    new pipeline fields pass through without being stripped by Pydantic.
    See the sub-model classes above for documented field schemas.
    """
    userId: str = Field(..., description="MongoDB _id of the user")
    body: Optional[Dict[str, Any]] = Field(None, description="Body shape analysis (see StyleDNABodyInfo)")
    face: Optional[Dict[str, Any]] = Field(None, description="Face analysis (see StyleDNAFaceInfo)")
    eyes: Optional[Dict[str, Any]] = Field(None, description="Eye details (see StyleDNAEyesInfo)")
    skin: Optional[Dict[str, Any]] = Field(None, description="Skin analysis (see StyleDNASkinInfo)")
    hair: Optional[Dict[str, Any]] = Field(None, description="Hair analysis (see StyleDNAHairInfo)")
    colorSeason: Optional[Dict[str, Any]] = Field(None, description="Color season (see StyleDNAColorSeason)")
    confidence: Optional[Dict[str, float]] = Field(None, description="Confidence scores per stage")
    warnings: Optional[List[str]] = Field(None, description="Pipeline warnings (NO_FACE, MULTIPLE_PEOPLE_CROP_SUGGESTED, etc.)")
    descriptions: Optional[Dict[str, str]] = Field(None, description="Human-readable descriptions per category")
    meta: Optional[Dict[str, Any]] = Field(None, description="Pipeline metadata (timings, image size, etc.)")
    success: bool = Field(default=True, description="Analysis success status")
