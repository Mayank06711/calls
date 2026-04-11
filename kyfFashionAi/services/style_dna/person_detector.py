"""Stage 0: Person detection gate using MediaPipe ObjectDetector (EfficientDet-Lite0).

Runs BEFORE all other analyzers. If no 'person' class detected with
sufficient confidence, the pipeline can short-circuit and skip heavy stages.

Model: EfficientDet-Lite0 (~4.4MB, int8 quantized)
Cost:  ~15-25ms inference, ~10-15MB RAM
"""

import os
from .interfaces import IAnalyzer, AnalysisContext

_MODEL_PATH = os.path.join(os.path.dirname(__file__), "models", "efficientdet_lite0.tflite")

# COCO class index 0 = "person"
_PERSON_CATEGORY = "person"
_MIN_PERSON_CONF = 0.35  # Low threshold — we just need to confirm "is there a person at all?"


class PersonDetector(IAnalyzer):
    """Detects whether the image contains a person (COCO 'person' class)."""

    def __init__(self):
        self._detector = None

    @property
    def name(self) -> str:
        return "person_detector"

    def load(self) -> None:
        import mediapipe as mp

        options = mp.tasks.vision.ObjectDetectorOptions(
            base_options=mp.tasks.BaseOptions(model_asset_path=_MODEL_PATH),
            running_mode=mp.tasks.vision.RunningMode.IMAGE,
            max_results=10,
            score_threshold=_MIN_PERSON_CONF,
        )
        self._detector = mp.tasks.vision.ObjectDetector.create_from_options(options)

    def analyze(self, ctx: AnalysisContext) -> dict:
        if self._detector is None:
            raise RuntimeError("PersonDetector.load() not called")

        import mediapipe as mp

        img_rgb = ctx.image[:, :, ::-1].copy()
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=img_rgb)

        result = self._detector.detect(mp_image)

        persons = []
        other_objects = []
        for det in result.detections:
            cat = det.categories[0]
            entry = {
                "label": cat.category_name,
                "score": round(cat.score, 3),
            }
            if cat.category_name == _PERSON_CATEGORY:
                persons.append(entry)
            else:
                other_objects.append(entry)

        has_person = len(persons) > 0
        person_count = len(persons)
        best_person_score = max((p["score"] for p in persons), default=0.0)

        return {
            "_person_detection": {
                "hasPerson": has_person,
                "personCount": person_count,
                "bestPersonScore": best_person_score,
                "otherObjects": other_objects[:5],  # Top 5 non-person detections
            },
            "_confidence": {},  # No standalone confidence key
        }

    def cleanup(self) -> None:
        if self._detector:
            self._detector.close()
            self._detector = None
