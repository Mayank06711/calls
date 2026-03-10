from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    PORT: int = 8001
    ENV: str = "development"

    # Security: Internal service authentication
    INTERNAL_SERVICE_KEY: str  # Shared secret with Node.js server
    SERVER_BASE_URL: str = "http://localhost:5005"  # Node.js server URL for validation

    # Cloudinary
    CLOUDINARY_CLOUD_NAME: str
    CLOUDINARY_API_KEY: str
    CLOUDINARY_API_SECRET: str
    CLOUDINARY_UPLOAD_FOLDER: str = "wardrobe-processed"

    # YOLO Models
    YOLO_POSE_MODEL: str = "yolo_models/yolov8n-pose.pt"
    YOLO_SEG_MODEL: str = "yolo_models/yolov8n-seg.pt"

    # Memory
    MAX_MEMORY_MB: int = 4096

    # CORS (not needed if proxied through Node.js, but kept for development)
    ALLOWED_ORIGINS: str = "http://localhost:5173,http://localhost:3000"

    class Config:
        env_file = ".env"

settings = Settings()

# ══════════════════════════════════════════════════════════════
#  Image Processing Constants
# ══════════════════════════════════════════════════════════════

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".bmp", ".tiff"}

# YOLO Keypoint Names (17 keypoints for YOLOv8-pose)
KEYPOINT_NAMES = [
    "nose", "left_eye", "right_eye", "left_ear", "right_ear",
    "left_shoulder", "right_shoulder", "left_elbow", "right_elbow",
    "left_wrist", "right_wrist", "left_hip", "right_hip",
    "left_knee", "right_knee", "left_ankle", "right_ankle",
]

# Slot size limits (pixels) for 1080px canvas
SLOT_SIZE_LIMITS = {
    "layer":     {"maxWidth": 500, "maxHeight": 480, "zIndex": 1},
    "top":       {"maxWidth": 450, "maxHeight": 420, "zIndex": 2},
    "bottom":    {"maxWidth": 420, "maxHeight": 520, "zIndex": 3},
    "footwear":  {"maxWidth": 180, "maxHeight": 140, "zIndex": 4},
    "accessory": {"maxWidth": 120, "maxHeight": 120, "zIndex": 5},
    "full_body": {"maxWidth": 550, "maxHeight": 700, "zIndex": 2},
}

# Map clothing type to slot name
TYPE_TO_SLOT = {
    "Top": "top",
    "Bottom": "bottom",
    "Shoes": "footwear",
    "Accessory": "accessory",
    "Outerwear": "layer",
    "Full Body": "full_body",
}

# Map clothing type to cloth_seg channel
TYPE_TO_CLOTHSEG_CHANNEL = {
    "Top": "upper",
    "Bottom": "lower",
    "Outerwear": "upper",
    "Full Body": "full",
    "Dress": "full",  # Legacy alias
    "Shoes": None,  # Not used with cloth_seg
    "Accessory": None,  # Not used with cloth_seg
}

# Canvas sizes for flat-lay generation
CANVAS_SIZES = {
    "standard": 1080,
    "thumbnail": 400,
}
