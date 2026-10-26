"""ResQ3D camera-vision helper.

OpenCV is used for basic image inspection in the MVP. This is intentionally
not presented as a trained fire-detection model. A future trained detector can
replace this class without changing the server API.
"""
from pathlib import Path
from typing import Any, Dict, Optional

try:
    import cv2
except ImportError:  # keep the server importable; endpoint reports the dependency
    cv2 = None


class VisionEngine:
    def __init__(self) -> None:
        self.available = cv2 is not None

    def status(self) -> Dict[str, Any]:
        return {
            "opencv_available": self.available,
            "engine": "ResQ3D OpenCV Vision MVP",
            "mode": "image-inspection-demo",
        }

    def verify_image(self, image_path: str) -> Dict[str, Any]:
        """Inspect an image and return explainable visual indicators.

        This MVP uses simple visual heuristics (red/orange pixel ratio and
        brightness). It does NOT claim to be a trained fire classifier.
        """
        if cv2 is None:
            return {
                "success": False,
                "verified": False,
                "error": "OpenCV is not installed. Run: pip install opencv-python",
            }

        path = Path(image_path)
        image = cv2.imread(str(path))
        if image is None:
            return {"success": False, "verified": False, "error": "Could not read image."}

        hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
        # Broad red/orange ranges for a transparent demo heuristic.
        red1 = cv2.inRange(hsv, (0, 90, 100), (25, 255, 255))
        red2 = cv2.inRange(hsv, (160, 90, 100), (179, 255, 255))
        fire_mask = cv2.bitwise_or(red1, red2)
        ratio = float(cv2.countNonZero(fire_mask)) / float(image.shape[0] * image.shape[1])
        mean_brightness = float(hsv[:, :, 2].mean())

        visual_indicator = ratio >= 0.015
        return {
            "success": True,
            "verified": visual_indicator,
            "visual_indicator": visual_indicator,
            "orange_red_ratio": round(ratio, 4),
            "mean_brightness": round(mean_brightness, 2),
            "note": "MVP OpenCV heuristic; replace with a trained fire/smoke model for production use.",
        }
