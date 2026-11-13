"""
EduAlto Machine Learning Pipeline - Model Training & Evaluation (EDU-110, EDU-111, EDU-112)

Trains Baseline models (Logistic Regression, Random Forest) and Champion model (LightGBM).
Performs comprehensive benchmark evaluation (ROC-AUC, PR-AUC, F1, Precision, Recall, Brier score),
extracts feature importances, and serializes model artifacts and metadata.
"""

from __future__ import annotations

import argparse
import json
import logging
import sys
from pathlib import Path
from typing import Any, Dict, List, Tuple

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from scripts.ml_pipeline.feature_pipeline import FEATURE_COLUMNS

import joblib
import lightgbm as lgb
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    average_precision_score,
    brier_score_loss,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("ml_train_evaluate")


def load_feature_splits(train_path: Path, test_path: Path) -> Tuple[pd.DataFrame, pd.DataFrame]:
    """Load train and test feature datasets."""
    if not train_path.exists() or not test_path.exists():
        raise FileNotFoundError(f"Feature datasets not found at {train_path} and {test_path}")
    train_df = pd.read_csv(train_path)
    test_df = pd.read_csv(test_path)
    logger.info("Loaded train set (rows=%d) and test set (rows=%d)", len(train_df), len(test_df))
    return train_df, test_df


def evaluate_model(name: str, model: Any, X_test: pd.DataFrame, y_test: pd.Series) -> Dict[str, Any]:
    """Compute comprehensive classification and ranking metrics."""
    preds = model.predict(X_test)
    probs = model.predict_proba(X_test)[:, 1] if hasattr(model, "predict_proba") else preds

    roc_auc = float(roc_auc_score(y_test, probs))
    pr_auc = float(average_precision_score(y_test, probs))
    acc = float(accuracy_score(y_test, preds))
    f1 = float(f1_score(y_test, preds, zero_division=0))
    f1_macro = float(f1_score(y_test, preds, average="macro", zero_division=0))
    prec = float(precision_score(y_test, preds, zero_division=0))
    rec = float(recall_score(y_test, preds, zero_division=0))
    brier = float(brier_score_loss(y_test, probs))
    cm = confusion_matrix(y_test, preds).tolist()

    metrics = {
        "model_name": name,
        "roc_auc": round(roc_auc, 4),
        "pr_auc": round(pr_auc, 4),
        "f1_score": round(f1, 4),
        "f1_macro": round(f1_macro, 4),
        "accuracy": round(acc, 4),
        "precision": round(prec, 4),
        "recall": round(rec, 4),
        "brier_score": round(brier, 4),
        "confusion_matrix": cm,
    }

    logger.info(
        "%-20s | ROC-AUC: %.4f | PR-AUC: %.4f | F1: %.4f | Acc: %.4f | Prec: %.4f | Rec: %.4f",
        name,
        roc_auc,
        pr_auc,
        f1,
        acc,
        prec,
        rec,
    )
    return metrics


def train_and_benchmark(
    train_df: pd.DataFrame,
    test_df: pd.DataFrame,
    target_col: str = "target_at_risk",
    models_dir: Path = Path("models"),
) -> Dict[str, Any]:
    """Train baseline models and champion LightGBM, then evaluate & persist artifacts."""
    X_train = train_df[FEATURE_COLUMNS].fillna(0.0)
    y_train = train_df[target_col].astype(int)
    X_test = test_df[FEATURE_COLUMNS].fillna(0.0)
    y_test = test_df[target_col].astype(int)

    logger.info(
        "Training features: %d, Train instances: %d (Pos: %d), Test instances: %d (Pos: %d)",
        len(FEATURE_COLUMNS),
        len(X_train),
        y_train.sum(),
        len(X_test),
        y_test.sum(),
    )

    models_dir.mkdir(parents=True, exist_ok=True)
    benchmark_results: List[Dict[str, Any]] = []

    # 1. Baseline: Logistic Regression (EDU-110)
    logger.info("Training Baseline 1: Logistic Regression...")
    lr_pipeline = Pipeline([
        ("scaler", StandardScaler()),
        ("clf", LogisticRegression(max_iter=1000, random_state=42, solver="lbfgs")),
    ])
    lr_pipeline.fit(X_train, y_train)
    lr_metrics = evaluate_model("Logistic Regression", lr_pipeline, X_test, y_test)
    benchmark_results.append(lr_metrics)

    # 2. Baseline: Random Forest (EDU-110)
    logger.info("Training Baseline 2: Random Forest...")
    rf = RandomForestClassifier(
        n_estimators=100,
        max_depth=5,
        min_samples_split=4,
        random_state=42,
        class_weight="balanced",
    )
    rf.fit(X_train, y_train)
    rf_metrics = evaluate_model("Random Forest", rf, X_test, y_test)
    benchmark_results.append(rf_metrics)

    # 3. Champion Model: LightGBM (EDU-111)
    logger.info("Training Champion: LightGBM...")
    lgbm = lgb.LGBMClassifier(
        n_estimators=120,
        max_depth=4,
        num_leaves=15,
        learning_rate=0.04,
        min_child_samples=10,
        subsample=0.85,
        colsample_bytree=0.85,
        random_state=42,
        class_weight="balanced",
        verbose=-1,
    )
    lgbm.fit(X_train, y_train)
    lgbm_metrics = evaluate_model("LightGBM (Champion)", lgbm, X_test, y_test)
    benchmark_results.append(lgbm_metrics)

    # Extract Feature Importances (EDU-112)
    feature_importances_gain = pd.Series(
        lgbm.booster_.feature_importance(importance_type="gain"),
        index=FEATURE_COLUMNS,
    ).sort_values(ascending=False)

    feature_importances_split = pd.Series(
        lgbm.booster_.feature_importance(importance_type="split"),
        index=FEATURE_COLUMNS,
    ).sort_values(ascending=False)

    importance_summary = [
        {
            "rank": rank + 1,
            "feature": feat,
            "gain": round(float(feature_importances_gain[feat]), 4),
            "split_count": int(feature_importances_split[feat]),
        }
        for rank, feat in enumerate(feature_importances_gain.index)
    ]

    logger.info("Top 5 Predictive Features (Gain): %s", [x["feature"] for x in importance_summary[:5]])

    # Persist Models
    model_joblib_path = models_dir / "lgbm_at_risk_model.joblib"
    model_txt_path = models_dir / "lgbm_at_risk_model.txt"
    joblib.dump({"model": lgbm, "feature_columns": FEATURE_COLUMNS}, model_joblib_path)
    lgbm.booster_.save_model(str(model_txt_path))
    logger.info("Saved LightGBM model to %s and %s", model_joblib_path, model_txt_path)

    # Decision rules / thresholds for fast inference & hybrid evaluation
    decision_rules = {
        "model_type": "LightGBM",
        "algorithm_version": "edualto-lgbm-v1",
        "target": target_col,
        "feature_columns": FEATURE_COLUMNS,
        "risk_thresholds": {
            "high_risk_prob": 0.70,
            "medium_risk_prob": 0.35,
        },
        "heuristics": {
            "inactive_days_threshold": 7,
            "low_quiz_score_threshold": 5.0,
            "low_assignment_score_threshold": 5.0,
            "low_active_days_threshold": 3,
            "low_study_time_seconds": 3600,
        },
        "reason_code_mappings": {
            "INACTIVE_DAYS": "Nghỉ > 7 ngày",
            "LOW_QUIZ_SCORE": "Quiz điểm thấp",
            "LOW_ASSIGNMENT_SCORE": "Bài tập điểm thấp",
            "LOW_ENGAGEMENT": "Ít tương tác",
            "ON_TRACK": "Đúng tiến độ",
        },
        "top_features": importance_summary[:8],
    }

    rules_path = models_dir / "decision_rules.json"
    with open(rules_path, "w", encoding="utf-8") as f:
        json.dump(decision_rules, f, indent=2, ensure_ascii=False)
    logger.info("Saved decision rules to %s", rules_path)

    # Full metadata artifact
    metadata = {
        "pipeline_version": "2.0.0",
        "task_keys": ["EDU-109", "EDU-110", "EDU-111", "EDU-112"],
        "target_variable": target_col,
        "train_samples": len(X_train),
        "test_samples": len(X_test),
        "feature_count": len(FEATURE_COLUMNS),
        "champion_model": "LightGBM",
        "benchmark_comparison": benchmark_results,
        "top_features_by_gain": importance_summary[:10],
        "artifacts": {
            "joblib_model": str(model_joblib_path),
            "txt_booster": str(model_txt_path),
            "decision_rules": str(rules_path),
        },
    }

    metadata_path = models_dir / "model_metadata.json"
    with open(metadata_path, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2, ensure_ascii=False)
    logger.info("Saved model metadata to %s", metadata_path)

    return metadata


def main() -> None:
    parser = argparse.ArgumentParser(description="EduAlto ML Model Training & Benchmarking (EDU-110..112)")
    parser.add_argument(
        "--train-data",
        type=Path,
        default=Path("data/ml_features_train.csv"),
        help="Path to train features CSV",
    )
    parser.add_argument(
        "--test-data",
        type=Path,
        default=Path("data/ml_features_test.csv"),
        help="Path to test features CSV",
    )
    parser.add_argument(
        "--models-dir",
        type=Path,
        default=Path("models"),
        help="Directory to save model artifacts",
    )
    args = parser.parse_args()

    train_df, test_df = load_feature_splits(args.train_data, args.test_data)
    train_and_benchmark(train_df, test_df, models_dir=args.models_dir)


if __name__ == "__main__":
    main()
