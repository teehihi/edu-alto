"""
EduAlto Machine Learning Pipeline - Inference Service (EDU-113)

Provides lightweight prediction scoring for Student Course Completion
and Early Drop-out Risk Assessment, outputting clean, concise JSON
suitable for direct UI rendering.
"""

from __future__ import annotations

import argparse
import json
import logging
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional

import joblib
import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from scripts.ml_pipeline.feature_pipeline import FEATURE_COLUMNS

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("ml_inference")

DEFAULT_MODEL_PATH = Path("models/lgbm_at_risk_model.joblib")
DEFAULT_RULES_PATH = Path("models/decision_rules.json")


class StudentRiskPredictor:
    """Predicts completion probability and early at-risk status using trained model."""

    def __init__(
        self,
        model_path: Path = DEFAULT_MODEL_PATH,
        rules_path: Path = DEFAULT_RULES_PATH,
    ) -> None:
        self.model_path = model_path
        self.rules_path = rules_path
        self.model = None
        self.rules = {}
        self._load_artifacts()

    def _load_artifacts(self) -> None:
        if self.model_path.exists():
            data = joblib.load(self.model_path)
            self.model = data["model"] if isinstance(data, dict) else data
            logger.info("Loaded model from %s", self.model_path)
        else:
            logger.warning("Model file %s not found, will rely on heuristics", self.model_path)

        if self.rules_path.exists():
            with open(self.rules_path, "r", encoding="utf-8") as f:
                self.rules = json.load(f)

    def extract_vector(self, features: Dict[str, Any]) -> List[float]:
        """Map input dictionary to ordered numerical feature vector."""
        return [float(features.get(col, 0.0) or 0.0) for col in FEATURE_COLUMNS]

    def determine_primary_factor(self, features: Dict[str, Any], prob_at_risk: float) -> Tuple[str, str]:
        """
        Extract the most dominant risk/success factor using observable thresholds.
        Returns (factor_code, concise_vietnamese_label).
        """
        days_inactive = float(features.get("days_since_last_activity", 0.0) or 0.0)
        avg_quiz = float(features.get("avg_quiz_score", 0.0) or 0.0)
        quiz_attempts = float(features.get("total_quiz_attempts", 0.0) or 0.0)
        avg_assign = float(features.get("avg_assignment_score", 0.0) or 0.0)
        assign_count = float(features.get("assignments_submitted_count", 0.0) or 0.0)
        active_days = float(features.get("active_learning_days_count", 0.0) or 0.0)
        study_seconds = float(features.get("total_study_time_seconds", 0.0) or 0.0)

        if prob_at_risk >= 0.35:
            if days_inactive >= 7:
                return "INACTIVE_DAYS", f"Nghỉ {int(days_inactive)} ngày"
            if quiz_attempts > 0 and avg_quiz < 5.0:
                return "LOW_QUIZ_SCORE", f"Quiz TB {avg_quiz:.1f}/10"
            if assign_count > 0 and avg_assign < 5.0:
                return "LOW_ASSIGNMENT_SCORE", f"Bài tập TB {avg_assign:.1f}/10"
            if active_days <= 2 or study_seconds < 1800:
                return "LOW_ENGAGEMENT", "Ít tương tác"
            return "AT_RISK_PACE", "Nhịp học chậm"

        # Low risk / positive
        if avg_quiz >= 8.5:
            return "EXCELLENT_SCORES", "Điểm số xuất sắc"
        if active_days >= 5:
            return "CONSISTENT_STUDY", "Học tập đều đặn"
        return "ON_TRACK", "Đúng tiến độ"

    def predict(self, features: Dict[str, Any]) -> Dict[str, Any]:
        """Compute prediction response for a single student enrollment."""
        vec = pd.DataFrame([self.extract_vector(features)], columns=FEATURE_COLUMNS)

        if self.model is not None and hasattr(self.model, "predict_proba"):
            prob_at_risk = float(self.model.predict_proba(vec)[0][1])
        else:
            # Heuristic fallback if model not loaded
            days_inactive = float(features.get("days_since_last_activity", 0.0) or 0.0)
            avg_quiz = float(features.get("avg_quiz_score", 0.0) or 0.0)
            prob_at_risk = 0.80 if days_inactive >= 14 else (0.45 if days_inactive >= 7 or avg_quiz < 5.0 else 0.15)

        completion_prob = round(float(np.clip(1.0 - prob_at_risk, 0.05, 0.98)), 2)

        # Risk classification
        if prob_at_risk >= 0.70:
            risk_level = "HIGH"
            status_badge = "Cần hỗ trợ"
            badge_color = "rose"
        elif prob_at_risk >= 0.35:
            risk_level = "MEDIUM"
            status_badge = "Cần theo dõi"
            badge_color = "amber"
        elif completion_prob >= 0.85:
            risk_level = "LOW"
            status_badge = "Rất tốt"
            badge_color = "emerald"
        else:
            risk_level = "LOW"
            status_badge = "Đúng tiến độ"
            badge_color = "primary"

        factor_code, factor_label = self.determine_primary_factor(features, prob_at_risk)

        return {
            "completionProbability": completion_prob,
            "completionPercentage": int(round(completion_prob * 100)),
            "atRiskProbability": round(prob_at_risk, 2),
            "riskLevel": risk_level,
            "statusBadge": status_badge,
            "badgeColor": badge_color,
            "primaryFactor": factor_code,
            "primaryFactorLabel": factor_label,
            "algorithmVersion": "edualto-lgbm-v1",
        }


def main() -> None:
    parser = argparse.ArgumentParser(description="EduAlto ML Single Instance Prediction")
    parser.add_argument("--features-json", type=str, help="JSON string of feature dict")
    parser.add_argument("--input-file", type=Path, help="JSON file containing feature dict")
    args = parser.parse_args()

    features = {}
    if args.features_json:
        features = json.loads(args.features_json)
    elif args.input_file and args.input_file.exists():
        with open(args.input_file, "r", encoding="utf-8") as f:
            features = json.load(f)
    else:
        # Sample test features
        features = {
            "total_study_time_seconds": 12000,
            "active_learning_days_count": 8,
            "days_since_last_activity": 2,
            "avg_quiz_score": 8.5,
            "max_quiz_score": 9.0,
            "total_quiz_attempts": 3,
            "quizzes_passed_count": 3,
            "avg_assignment_score": 8.0,
            "assignments_submitted_count": 2,
        }
        logger.info("No input provided, running sample prediction...")

    predictor = StudentRiskPredictor()
    result = predictor.predict(features)
    print(json.dumps(result, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
