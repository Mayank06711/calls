# KYF Fashion AI Service

Standalone FastAPI service for wardrobe image processing.

## Features
- Background removal (YOLO for person photos, u2netp for products)
- Dominant color extraction
- Flat-lay outfit preview generation

## Setup

1. Install dependencies:
```bash
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

2. Copy YOLO models to `yolo_models/`:
   - Move ../photos/yolov8n-pose.pt here
   - Move ../photos/yolov8n-seg.pt here

3. Configure `.env` with Cloudinary credentials

4. Run server:
```bash
python main.py
```

Server runs on http://localhost:8001

## API Endpoints

- `GET /health` - Health check
- `POST /api/v1/process-item` - Process single clothing item
- `POST /api/v1/generate-flatlay` - Generate flat-lay preview

See API documentation at http://localhost:8001/docs

## Development

Refactor code from `../photos/remove_bg_v2.py` into `services/` modules.
See `../IMPLEMENTATION_PHASE7.md` for detailed instructions.
