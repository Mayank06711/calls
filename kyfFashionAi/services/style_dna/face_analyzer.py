"""Stage 2: Face analysis (age, gender) using InsightFace buffalo_sc + genderage."""

import numpy as np
from .interfaces import IAnalyzer, AnalysisContext


class FaceAnalyzer(IAnalyzer):
    """Extracts age, gender, and face bounding box using InsightFace."""

    def __init__(self):
        self._app = None

    @property
    def name(self) -> str:
        return "face_analyzer"

    def load(self) -> None:
        from insightface.app import FaceAnalysis

        # buffalo_sc = smallest model (~16MB) + genderage.onnx (~1.3MB)
        # Providers: CPU only — no GPU requirement
        self._app = FaceAnalysis(
            name="buffalo_sc",
            providers=["CPUExecutionProvider"],
        )
        self._app.prepare(ctx_id=0, det_size=(320, 320))

    def analyze(self, ctx: AnalysisContext) -> dict:
        if self._app is None:
            raise RuntimeError("FaceAnalyzer.load() not called")

        faces = self._app.get(ctx.image)

        if not faces:
            return {"face_basic": None, "_confidence": {"face": 0.0}, "_face_count": 0}

        # Pick the largest face (most prominent person)
        face = max(faces, key=lambda f: (f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1]))

        # Cache face bounding box for later stages
        x1, y1, x2, y2 = [int(v) for v in face.bbox]
        ctx.face_bbox = (x1, y1, x2 - x1, y2 - y1)

        # Age — safely handle missing attribute
        age = None
        if hasattr(face, "age") and face.age is not None:
            try:
                age = int(face.age)
            except (TypeError, ValueError):
                pass

        # Gender — safely handle missing attribute
        # InsightFace gender: 0=female, 1=male
        gender = None
        if hasattr(face, "gender") and face.gender is not None:
            try:
                gender_val = int(face.gender)
                gender = "male" if gender_val == 1 else "female"
            except (TypeError, ValueError):
                pass

        confidence = round(float(face.det_score), 2) if hasattr(face, "det_score") else 0.8

        # Age range: ±5 for typical, ±10 for edge cases (children/elderly)
        age_range = None
        age_confidence = "medium"
        if age is not None:
            if age < 18:
                # Children: model adds 15-25 years, widen range significantly
                margin = 10
                age_confidence = "low"
            elif age > 55:
                # Elderly: model underestimates by 15-20 years
                margin = 10
                age_confidence = "low"
            else:
                margin = 5
                age_confidence = "medium"
            age_range = [max(1, age - margin), age + margin]

        return {
            "face_basic": {
                "estimatedAge": age,
                "ageRange": age_range,
                "ageConfidence": age_confidence,
                "gender": gender,
            },
            "_confidence": {"face": confidence},
            "_face_count": len(faces),
        }

    def cleanup(self) -> None:
        self._app = None
