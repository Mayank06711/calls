"""
Pydantic request models for FastAPI endpoints.
"""
from typing import List, Optional
from pydantic import BaseModel, Field, HttpUrl


class ProcessItemRequest(BaseModel):
    """
    Request to process a single clothing item.
    
    This endpoint:
    1. Downloads image from photoUrl
    2. Removes background based on hasPersonInPhoto flag
    3. Extracts dominant colors
    4. Uploads nobg image to Cloudinary
    5. Returns processing metadata
    """
    itemId: str = Field(..., description="MongoDB _id of the clothing item")
    photoUrl: HttpUrl = Field(..., description="Cloudinary URL of original photo")
    itemType: str = Field(..., description="Type of clothing: Top, Bottom, Shoes, Outerwear, etc.")
    hasPersonInPhoto: bool = Field(
        default=False,
        description="User's toggle: True = person photo, False = product photo. Auto-corrected by server-side person detection."
    )


class ClothingItemInput(BaseModel):
    """Single clothing item for flat-lay generation."""
    itemId: str = Field(..., description="MongoDB _id of the clothing item")
    nobgUrl: HttpUrl = Field(..., description="Cloudinary URL of background-removed image")
    itemType: str = Field(..., description="Type of clothing: Top, Bottom, Shoes, Outerwear, etc.")
    dominantColors: List[dict] = Field(
        default_factory=list,
        description="Dominant colors extracted from item"
    )


class GenerateFlatlayRequest(BaseModel):
    """
    Request to generate flat-lay preview from multiple items.
    
    This endpoint:
    1. Downloads nobg images for all items
    2. Composes flat-lay with adaptive positioning
    3. Generates color palette
    4. Uploads flat-lay to Cloudinary
    5. Returns flat-lay URL and metadata
    """
    outfitId: Optional[str] = Field(None, description="MongoDB _id of outfit (if saving)")
    items: List[ClothingItemInput] = Field(
        ...,
        min_items=2,
        max_items=10,
        description="List of clothing items (2-10 items)"
    )
    canvasSize: int = Field(
        default=1080,
        ge=400,
        le=2048,
        description="Canvas size in pixels (default: 1080)"
    )
    includePalette: bool = Field(
        default=True,
        description="Include color palette on flat-lay (default: True)"
    )
    bgColor: Optional[List[int]] = Field(
        default=None,
        description="Background color as [r, g, b] (default: [245, 245, 240])"
    )


class AnalyzeStyleDNARequest(BaseModel):
    """
    Request to analyze a user's photo for Style DNA (body, face, skin, hair, color season).

    Flow:
    1. Download image from thumbnailUrl (preferred) or imageUrl (fallback)
    2. Run Style DNA pipeline (6 stages: person → body → face → geometry → skin → hair)
    3. Generate human-readable descriptions
    4. Return full analysis with confidence scores and warnings
    """
    userId: str = Field(..., description="MongoDB _id of the user")
    imageUrl: HttpUrl = Field(..., description="Primary image URL (Cloudinary original)")
    thumbnailUrl: Optional[HttpUrl] = Field(None, description="Thumbnail URL (preferred for lower bandwidth)")
