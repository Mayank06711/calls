"""Abstract base classes for Style DNA analyzers (Dependency Inversion)."""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any
import numpy as np


@dataclass
class AnalysisContext:
    """Shared context passed between pipeline stages.

    Each analyzer reads what it needs and writes its results here.
    Avoids re-computing expensive operations (e.g., face crop).
    """
    image: np.ndarray                        # Original BGR image
    results: dict = field(default_factory=dict)

    # Cached intermediate data (set by earlier stages)
    face_bbox: tuple | None = None           # (x, y, w, h) from face detection
    face_landmarks_468: Any = None           # MediaPipe 468 face landmarks
    pose_landmarks_33: Any = None            # MediaPipe 33 pose landmarks
    _face_lm_image: Any = None               # Image used for face landmarks (may be crop)


class IAnalyzer(ABC):
    """Interface every Style DNA analyzer must implement."""

    @abstractmethod
    def load(self) -> None:
        """Load model weights into memory. Called once before analyze()."""
        ...

    @abstractmethod
    def analyze(self, ctx: AnalysisContext) -> dict:
        """Run analysis on the image. Returns partial result dict.

        May read from ctx.results (set by previous stages) and
        should write reusable intermediates (landmarks, crops) to ctx.
        """
        ...

    @abstractmethod
    def cleanup(self) -> None:
        """Release model from memory. Called after analyze()."""
        ...

    @property
    @abstractmethod
    def name(self) -> str:
        """Human-readable name for logging."""
        ...
