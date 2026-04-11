# Style DNA Pipeline — Research & Architecture

## Goal
Extract maximum physical attributes from a single full-body photo.
User only answers subjective questions (color preferences, mood, etc.).

## Pipeline Architecture (4 Stages, Sequential Loading)

### Stage 1: Body Analysis — MediaPipe Pose Landmarker
- Model: ~6MB, CPU-only
- RAM: ~50MB
- Output: 33 3D body landmarks
- Derived: body shape (hourglass/pear/apple/rectangle/inverted-triangle),
  shoulder-to-hip ratio, torso-leg ratio, height estimate
- Source: https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker
- Body shape classification uses Shoulder-to-Hip Ratio (SHR):
  SHR > 1.15 = Inverted Triangle
  SHR < 0.85 = Pear/Triangle
  0.85-1.15 + narrow waist = Hourglass
  0.85-1.15 + uniform = Rectangle

### Stage 2: Face Analysis — InsightFace buffalo_sc
- Model: ~40MB ONNX
- RAM: ~120MB
- Output: age, gender, face embedding (512-dim)
- Why not DeepFace: VGG-Face backbone = 500MB+ RAM, much slower on CPU
- InsightFace buffalo_sc = edge-optimized, 1600 FPS on GPU, fast on CPU too
- Source: https://github.com/deepinsight/insightface

### Stage 3: Face Geometry — MediaPipe Face Mesh
- Model: ~2MB (shares MediaPipe runtime with Stage 1)
- RAM: ~30MB shared
- Output: 468 3D face landmarks
- Derived:
  - Face shape: jaw_width/face_height ratio → oval/round/square/heart/oblong
    (ref: https://github.com/akashchoudhary436/Face-Shape-Detection)
  - Eye shape: eye_height/eye_width ratio → almond/round/hooded/monolid
  - Nose proportion: nose_width/face_width → narrow/medium/wide
  - Lip fullness: lip_height/lip_width → thin/medium/full

### Stage 4: Skin + Hair — Pixel Sampling + Lightweight CNN
- Skin tone: Sample forehead+cheek pixels → LAB color space →
  Map L* to Monk 10-point scale (https://skintone.google/)
  a* channel → warm/cool undertone. Zero model weight.
  Ref: https://github.com/ChenglongMa/SkinToneClassifier
- Hair type: Crop head region → ResNet18 classifier (~5MB)
  Categories: straight/wavy/curly/kinky/bald
  Ref: https://github.com/Kavya-sree/Hair-Type-Classifier (88% accuracy)
- Hair color: Dominant color from hair region pixels
- Baldness: Norwood scale estimation
  Ref: https://github.com/macarize/Intelligent_hair_analysis_system
- Eye color: Sample iris region pixels → classify
- RAM: ~80MB (only hair classifier model)

## Color Season Derivation (algorithmic, no model)
- warm undertone + light hair/eyes → Spring
- warm undertone + dark hair/eyes → Autumn
- cool undertone + light hair/eyes → Summer
- cool undertone + dark hair/eyes → Winter

## RAM Budget (Sequential Loading)
| Stage              | Peak RAM | Duration |
|--------------------|----------|----------|
| MediaPipe Pose     | ~50MB    | ~200ms   |
| InsightFace        | ~120MB   | ~300ms   |
| MediaPipe FaceMesh | ~30MB    | ~100ms   |
| Hair classifier    | ~80MB    | ~150ms   |
| Skin (pure math)   | ~0MB     | ~5ms     |
| **Sequential peak**| **~150MB** | **~750ms total** |

## Output Schema
```json
{
  "body": {
    "shape": "inverted_triangle",
    "shoulderHipRatio": 1.22,
    "torsoLegRatio": 0.48,
    "heightCategory": "tall"
  },
  "face": {
    "shape": "oval",
    "estimatedAge": 26,
    "gender": "male"
  },
  "eyes": { "shape": "almond", "color": { "name": "brown", "hex": "#634e34" } },
  "nose": { "proportion": "medium" },
  "lips": { "fullness": "medium" },
  "skin": {
    "monkTone": 5,
    "undertone": "warm",
    "hex": "#c68642"
  },
  "hair": {
    "type": "wavy",
    "color": { "name": "dark_brown", "hex": "#3b2219" },
    "baldnessLevel": 0
  },
  "colorSeason": "autumn",
  "confidence": { "body": 0.87, "face": 0.94, "skin": 0.91, "hair": 0.85 }
}
```

## Key Dependencies
- mediapipe >= 0.10.9
- insightface >= 0.7.3
- onnxruntime >= 1.16.0 (CPU only, no GPU needed)
- numpy (already installed)
- opencv-python (already installed)
- pillow (already installed)
- scikit-learn (for hair classifier, or use ONNX export)

## SOLID Principles
- **S** — Each analyzer has one job (body, face, geometry, skin, hair)
- **O** — New analyzers can be added without modifying existing ones
- **L** — All analyzers implement IAnalyzer interface
- **I** — Minimal interface: analyze() + cleanup()
- **D** — Pipeline depends on abstractions (IAnalyzer), not concrete classes
